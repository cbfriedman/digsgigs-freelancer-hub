import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fee rule: Gross = milestone amount. 3% transaction fee paid by Gigger. 8% platform fee paid by Digger (deducted from payout).
const TRANSACTION_FEE_PERCENT = 3; // Gigger pays gross + 3%

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHARGE-MILESTONE] ${step}${s}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");

    const { milestonePaymentId } = (await req.json()) as { milestonePaymentId: string };
    if (!milestonePaymentId) throw new Error("Missing milestonePaymentId");

    const { data: milestone, error: mError } = await supabaseAdmin
      .from("milestone_payments")
      .select(
        "id, amount, description, digger_payout, platform_fee, status, stripe_payment_intent_id, escrow_contract_id, escrow_contracts!inner(consumer_id, digger_id, gig_id)"
      )
      .eq("id", milestonePaymentId)
      .single();

    if (mError || !milestone) throw new Error("Milestone not found");
    const contract = (milestone as any).escrow_contracts;
    if (!contract || contract.consumer_id !== user.id) {
      throw new Error("Only the Gigger (client) can approve and pay this milestone");
    }
    if (milestone.status !== "submitted") {
      throw new Error(`Milestone must be submitted by the Digger first (current: ${milestone.status})`);
    }
    if ((milestone as any).stripe_payment_intent_id) {
      throw new Error("This milestone has already been paid");
    }

    const { data: defaultPm } = await supabaseAdmin
      .from("payment_methods")
      .select("stripe_payment_method_id, stripe_customer_id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .limit(1)
      .single();

    if (!defaultPm) throw new Error("No default payment method. Please add one in Settings.");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const amountCents = Math.round(Number(milestone.amount) * 100); // gross
    const transactionFeeCents = Math.round(amountCents * (TRANSACTION_FEE_PERCENT / 100)); // 3% from Gigger
    const totalChargeCents = amountCents + transactionFeeCents; // Gigger pays gross + 3%

    const idempotencyKey = `milestone-${milestonePaymentId}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalChargeCents,
        currency: "usd",
        customer: defaultPm.stripe_customer_id,
        payment_method: defaultPm.stripe_payment_method_id,
        confirm: true,
        description: `Milestone payment - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
        metadata: {
          type: "milestone",
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
          consumer_id: contract.consumer_id,
          digger_id: contract.digger_id,
          gig_id: contract.gig_id,
        },
        return_url: `${req.headers.get("origin") || ""}/my-gigs?payment=success`,
      },
      { idempotencyKey }
    );

    logStep("PaymentIntent created", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: totalChargeCents,
    });

    if (paymentIntent.status === "requires_action") {
      return new Response(
        JSON.stringify({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (paymentIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({
          error: "Payment did not succeed",
          status: paymentIntent.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("stripe_connect_account_id")
      .eq("id", contract.digger_id)
      .single();

    const diggerPayoutCents = Math.round(Number(milestone.digger_payout) * 100); // gross - 8%
    let stripeTransferId: string | null = null;
    if (diggerProfile?.stripe_connect_account_id) {
      const transfer = await stripe.transfers.create({
        amount: diggerPayoutCents,
        currency: "usd",
        destination: diggerProfile.stripe_connect_account_id,
        description: `Milestone payment - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
        metadata: {
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
        },
      });
      stripeTransferId = transfer.id;
      logStep("Transfer created", { transferId: transfer.id });
    } else {
      logStep("Digger has no Connect account - payment taken but transfer skipped", {
        milestonePaymentId,
      });
    }

    await supabaseAdmin
      .from("milestone_payments")
      .update({
        status: "paid",
        stripe_payment_intent_id: paymentIntent.id,
        ...(stripeTransferId && {
          stripe_transfer_id: stripeTransferId,
          released_at: new Date().toISOString(),
        }),
      })
      .eq("id", milestonePaymentId);

    let bidId = (await supabaseAdmin.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single()).data?.awarded_bid_id;
    if (!bidId) {
      const bidRow = await supabaseAdmin
        .from("bids")
        .select("id")
        .eq("gig_id", contract.gig_id)
        .eq("digger_id", contract.digger_id)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();
      bidId = bidRow.data?.id ?? null;
    }
    await supabaseAdmin.from("transactions").insert({
      gig_id: contract.gig_id,
      bid_id: bidId ?? null,
      consumer_id: contract.consumer_id,
      digger_id: contract.digger_id,
      total_amount: totalChargeCents / 100, // what Gigger paid (gross + 3%)
      commission_rate: TRANSACTION_FEE_PERCENT / 100,
      commission_amount: transactionFeeCents / 100,
      digger_payout: Number(milestone.digger_payout), // gross - 8%
      status: "completed",
      completed_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntent.id,
      escrow_contract_id: milestone.escrow_contract_id,
      milestone_payment_id: milestonePaymentId,
      is_escrow: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment successful. The Digger will receive the milestone amount minus 8% platform fee.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
