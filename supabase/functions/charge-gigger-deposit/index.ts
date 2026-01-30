import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-GIGGER-DEPOSIT] ${step}${detailsStr}`);
};

// Deposit calculation constants
// NEW MODEL: 15% deposit, 8% referral fee (no caps)
// Digger pays 0 upfront - referral fee only charged if they don't accept
const DEPOSIT_RATE = 0.15; // 15% deposit from Gigger
const REFERRAL_FEE_RATE = 0.08; // 8% referral fee (deducted from deposit on acceptance)

// Calculate Gigger deposit: 15% of bid amount (no minimum)
const calculateGiggerDepositCents = (bidAmountCents: number): { 
  total: number; 
  depositAmount: number; 
  referralFee: number; 
} => {
  const depositCents = Math.round(bidAmountCents * DEPOSIT_RATE);
  const referralFeeCents = Math.round(bidAmountCents * REFERRAL_FEE_RATE);
  return {
    total: depositCents,
    depositAmount: depositCents,
    referralFee: referralFeeCents,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const { bidId, gigId, giggerId, diggerId, origin } = await req.json();

    if (!bidId || !gigId || !giggerId || !diggerId) {
      throw new Error("bidId, gigId, giggerId, and diggerId are required");
    }

    logStep("Processing Gigger deposit", { bidId, gigId, giggerId, diggerId });

    // Get the bid details
    const { data: bid, error: bidError } = await supabaseClient
      .from("bids")
      .select("*")
      .eq("id", bidId)
      .single();

    if (bidError || !bid) {
      throw new Error(`Bid not found: ${bidError?.message}`);
    }

    // Check if this is an exclusive (success_based) bid
    if (bid.pricing_model !== "success_based") {
      logStep("Not a success-based bid, skipping deposit", { pricingModel: bid.pricing_model });
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Not an exclusive bid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if deposit already exists
    const { data: existingDeposit } = await supabaseClient
      .from("gigger_deposits")
      .select("*")
      .eq("bid_id", bidId)
      .eq("gigger_id", giggerId)
      .maybeSingle();

    if (existingDeposit && existingDeposit.status === "paid") {
      logStep("Deposit already paid", { depositId: existingDeposit.id });
      return new Response(
        JSON.stringify({ success: true, alreadyPaid: true, depositId: existingDeposit.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate deposit amount
    const bidAmountCents = Math.round(bid.amount * 100);
    const depositDetails = calculateGiggerDepositCents(bidAmountCents);

    logStep("Deposit calculated", {
      bidAmount: bid.amount,
      depositTotal: depositDetails.total / 100,
      depositAmount: depositDetails.depositAmount / 100,
      referralFee: depositDetails.referralFee / 100,
    });

    // Get Gigger's profile to find Stripe customer ID
    const { data: giggerProfile } = await supabaseClient
      .from("profiles")
      .select("email, first_name, last_name, stripe_customer_id")
      .eq("id", giggerId)
      .single();

    // Set acceptance deadline (24 hours from now)
    const acceptanceDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Create or get Stripe customer
    let customerId = giggerProfile?.stripe_customer_id;
    
    if (!customerId && giggerProfile?.email) {
      const customers = await stripe.customers.list({ email: giggerProfile.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // Update profile with customer ID
        await supabaseClient
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", giggerId);
      }
    }

    // Create deposit record
    const { data: deposit, error: depositError } = await supabaseClient
      .from("gigger_deposits")
      .insert({
        gig_id: gigId,
        bid_id: bidId,
        gigger_id: giggerId,
        digger_id: diggerId,
        deposit_amount_cents: depositDetails.total,
        base_rate_amount_cents: depositDetails.depositAmount, // Full 15% deposit
        lead_cost_amount_cents: depositDetails.referralFee, // 8% referral fee portion
        status: "pending",
        acceptance_deadline: acceptanceDeadline,
      })
      .select()
      .single();

    if (depositError) {
      throw new Error(`Failed to create deposit record: ${depositError.message}`);
    }

    logStep("Deposit record created", { depositId: deposit.id });

    // Create Stripe Checkout Session for the deposit
    const checkoutOrigin = origin || "https://digsgigs-freelancer-hub.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : giggerProfile?.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Exclusive Award Deposit",
              description: `15% deposit ($${(depositDetails.total / 100).toFixed(2)}) for exclusive job award. 8% referral fee ($${(depositDetails.referralFee / 100).toFixed(2)}) is retained on Digger acceptance. Full refund if Digger doesn't accept.`,
            },
            unit_amount: depositDetails.total,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${checkoutOrigin}/gig/${gigId}?deposit_paid=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutOrigin}/gig/${gigId}?deposit_cancelled=true`,
      metadata: {
        deposit_id: deposit.id,
        gig_id: gigId,
        bid_id: bidId,
        gigger_id: giggerId,
        digger_id: diggerId,
        type: "gigger_deposit",
      },
    });

    // Update deposit with checkout session ID
    await supabaseClient
      .from("gigger_deposits")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", deposit.id);

    logStep("Stripe checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({
        success: true,
        requiresPayment: true,
        checkoutUrl: session.url,
        depositId: deposit.id,
        depositAmountCents: depositDetails.total,
        acceptanceDeadline,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
