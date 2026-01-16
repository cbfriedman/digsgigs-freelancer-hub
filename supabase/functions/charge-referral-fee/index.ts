import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-REFERRAL-FEE] ${step}${detailsStr}`);
};

// Fee configuration
const REFERRAL_FEE_RATE = 0.03; // 3% for exclusive
const REFERRAL_FEE_MIN_CENTS = 1000; // $10 minimum
const REFERRAL_FEE_CAP_CENTS = 24900; // $249 cap

// Non-exclusive pricing for deposit calculation
const NON_EXCLUSIVE_RATE = 0.02; // 2%
const NON_EXCLUSIVE_MIN_CENTS = 300; // $3 minimum
const NON_EXCLUSIVE_MAX_CENTS = 4900; // $49 maximum

// Deposit configuration: higher of (5% + non-exclusive cost) or $249
const DEPOSIT_BASE_RATE = 0.05; // 5% base
const DEPOSIT_MIN_CENTS = 24900; // $249 minimum deposit

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
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const { bidId, gigId, diggerId } = await req.json();

    if (!bidId || !gigId || !diggerId) {
      throw new Error("bidId, gigId, and diggerId are required");
    }

    logStep("Processing referral fee charge", { bidId, gigId, diggerId });

    // Get the bid details
    const { data: bid, error: bidError } = await supabaseClient
      .from("bids")
      .select("*")
      .eq("id", bidId)
      .single();

    if (bidError || !bid) {
      throw new Error(`Bid not found: ${bidError?.message}`);
    }

    // Verify this is a success-based bid
    if (bid.pricing_model !== "success_based") {
      logStep("Bid is not success-based, skipping charge", { 
        pricing_model: bid.pricing_model 
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: "Bid is not success-based" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already charged
    if (bid.referral_fee_charged_at) {
      logStep("Referral fee already charged", { 
        charged_at: bid.referral_fee_charged_at 
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: "Already charged" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate the referral fee (3% with $10 min, $249 cap)
    const bidAmountCents = Math.round(bid.amount * 100);
    const calculatedFeeCents = Math.round(bidAmountCents * REFERRAL_FEE_RATE);
    // Apply minimum and maximum constraints
    const feeCents = Math.max(REFERRAL_FEE_MIN_CENTS, Math.min(calculatedFeeCents, REFERRAL_FEE_CAP_CENTS));

    // Calculate Gigger deposit: higher of (5% + non-exclusive cost) or $249
    const nonExclusivePercentageCents = Math.round(bidAmountCents * NON_EXCLUSIVE_RATE);
    const nonExclusiveCostCents = Math.max(NON_EXCLUSIVE_MIN_CENTS, Math.min(nonExclusivePercentageCents, NON_EXCLUSIVE_MAX_CENTS));
    const percentageDepositCents = Math.round(bidAmountCents * DEPOSIT_BASE_RATE) + nonExclusiveCostCents;
    const depositCents = Math.max(DEPOSIT_MIN_CENTS, percentageDepositCents);

    logStep("Fee calculated", {
      bidAmount: bid.amount,
      bidAmountCents,
      calculatedFeeCents,
      feeCents,
      minApplied: calculatedFeeCents < REFERRAL_FEE_MIN_CENTS,
      capApplied: calculatedFeeCents > REFERRAL_FEE_CAP_CENTS,
      nonExclusiveCostCents,
      depositCents
    });

    // Get the digger's profile to find their Stripe customer ID
    const { data: diggerProfile, error: diggerError } = await supabaseClient
      .from("digger_profiles")
      .select("user_id, stripe_customer_id, business_name")
      .eq("id", diggerId)
      .single();

    if (diggerError || !diggerProfile) {
      throw new Error(`Digger profile not found: ${diggerError?.message}`);
    }

    // Get user email for Stripe customer creation if needed
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", diggerProfile.user_id)
      .single();

    let stripeCustomerId = diggerProfile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      logStep("Creating Stripe customer for digger");
      
      const customer = await stripe.customers.create({
        email: profile?.email,
        name: diggerProfile.business_name || profile?.full_name,
        metadata: {
          digger_id: diggerId,
          user_id: diggerProfile.user_id,
        },
      });

      stripeCustomerId = customer.id;

      // Update digger profile with Stripe customer ID
      await supabaseClient
        .from("digger_profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", diggerId);

      logStep("Stripe customer created", { customerId: stripeCustomerId });
    }

    // Create a referral payment record
    const { data: referralPayment, error: paymentInsertError } = await supabaseClient
      .from("referral_payments")
      .insert({
        bid_id: bidId,
        gig_id: gigId,
        digger_id: diggerId,
        amount_cents: feeCents,
        fee_rate: REFERRAL_FEE_RATE,
        fee_cap_cents: REFERRAL_FEE_CAP_CENTS,
        bid_amount: bid.amount,
        status: "processing",
      })
      .select()
      .single();

    if (paymentInsertError) {
      throw new Error(`Failed to create referral payment record: ${paymentInsertError.message}`);
    }

    logStep("Referral payment record created", { paymentId: referralPayment.id });

    // Get gig title for description
    const { data: gig } = await supabaseClient
      .from("gigs")
      .select("title")
      .eq("id", gigId)
      .single();

    // Create a PaymentIntent for immediate charge
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: feeCents,
        currency: "usd",
        customer: stripeCustomerId,
        description: `Referral fee for: ${gig?.title || 'Awarded project'}`,
        metadata: {
          type: "referral_fee",
          bid_id: bidId,
          gig_id: gigId,
          digger_id: diggerId,
          referral_payment_id: referralPayment.id,
        },
        // Try to charge immediately using saved payment method
        off_session: true,
        confirm: true,
        payment_method_types: ["card"],
      });

      logStep("PaymentIntent created", { 
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status 
      });

      // Update referral payment with Stripe details
      if (paymentIntent.status === "succeeded") {
        await supabaseClient
          .from("referral_payments")
          .update({
            stripe_payment_intent_id: paymentIntent.id,
            stripe_charge_id: paymentIntent.latest_charge as string,
            status: "completed",
            charged_at: new Date().toISOString(),
          })
          .eq("id", referralPayment.id);

        // Update the bid with fee info
        await supabaseClient
          .from("bids")
          .update({
            referral_fee_cents: feeCents,
            referral_fee_charged_at: new Date().toISOString(),
          })
          .eq("id", bidId);

        logStep("Charge successful", { feeCents });

        return new Response(
          JSON.stringify({
            success: true,
            charged: true,
            feeCents,
            paymentIntentId: paymentIntent.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Payment requires action (e.g., 3D Secure)
        throw new Error(`Payment requires additional action: ${paymentIntent.status}`);
      }
    } catch (stripeError: any) {
      logStep("Stripe charge failed", { error: stripeError.message });

      // If no saved payment method, create a checkout session instead
      if (stripeError.code === "payment_intent_unexpected_state" || 
          stripeError.code === "invoice_requires_action" ||
          stripeError.type === "StripeInvalidRequestError") {
        
        logStep("Creating checkout session for referral fee");

        const origin = req.headers.get("origin") || "https://digsandgigs.net";
        
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: feeCents,
                product_data: {
                  name: "Referral Fee",
                  description: `2% referral fee for winning: ${gig?.title || 'project'}`,
                },
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${origin}/my-bids?referral_paid=true&gig=${gigId}`,
          cancel_url: `${origin}/my-bids?referral_pending=true&gig=${gigId}`,
          metadata: {
            type: "referral_fee",
            bid_id: bidId,
            gig_id: gigId,
            digger_id: diggerId,
            referral_payment_id: referralPayment.id,
          },
        });

        // Update referral payment with checkout session
        await supabaseClient
          .from("referral_payments")
          .update({
            stripe_payment_intent_id: session.id,
            status: "pending",
          })
          .eq("id", referralPayment.id);

        logStep("Checkout session created", { sessionId: session.id });

        return new Response(
          JSON.stringify({
            success: true,
            requiresPayment: true,
            checkoutUrl: session.url,
            feeCents,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update referral payment as failed
      await supabaseClient
        .from("referral_payments")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          failure_reason: stripeError.message,
        })
        .eq("id", referralPayment.id);

      throw stripeError;
    }
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