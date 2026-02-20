import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK-MILESTONE] ${step}${s}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_MILESTONE_SECRET") ?? Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (e) {
        logStep("Webhook signature verification failed", { error: String(e) });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type !== "payment_intent.succeeded") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const pi = event.data.object as Stripe.PaymentIntent;
    if (pi.metadata?.type !== "milestone") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const milestonePaymentId = pi.metadata.milestone_payment_id;
    if (!milestonePaymentId) {
      logStep("Missing milestone_payment_id in metadata");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: milestone, error: mError } = await supabase
      .from("milestone_payments")
      .select("id, amount, digger_payout, description, status, stripe_payment_intent_id, escrow_contract_id, escrow_contracts!inner(digger_id, gig_id, consumer_id)")
      .eq("id", milestonePaymentId)
      .single();

    if (mError || !milestone) {
      logStep("Milestone not found", { milestonePaymentId });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if ((milestone as any).stripe_payment_intent_id) {
      logStep("Already processed (idempotent skip)", { milestonePaymentId });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const contract = (milestone as any).escrow_contracts;
    const diggerPayoutCents = Math.round(Number((milestone as any).digger_payout ?? milestone.amount) * 100); // gross - 8%

    const { data: diggerProfile } = await supabase
      .from("digger_profiles")
      .select("stripe_connect_account_id")
      .eq("id", contract.digger_id)
      .single();

    let stripeTransferId: string | null = null;
    if (diggerProfile?.stripe_connect_account_id) {
      const transfer = await stripe.transfers.create({
        amount: diggerPayoutCents,
        currency: "usd",
        destination: diggerProfile.stripe_connect_account_id,
        description: `Milestone - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
        metadata: {
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
        },
      });
      stripeTransferId = transfer.id;
      logStep("Transfer created", { transferId: transfer.id });
    }

    await supabase
      .from("milestone_payments")
      .update({
        status: "paid",
        stripe_payment_intent_id: pi.id,
        ...(stripeTransferId && {
          stripe_transfer_id: stripeTransferId,
          released_at: new Date().toISOString(),
        }),
      })
      .eq("id", milestonePaymentId);

    const contractData = contract as { digger_id: string; gig_id: string; consumer_id: string };
    let bidId = (await supabase.from("gigs").select("awarded_bid_id").eq("id", contractData.gig_id).single()).data?.awarded_bid_id;
    if (!bidId) {
      const bidRow = await supabase
        .from("bids")
        .select("id")
        .eq("gig_id", contractData.gig_id)
        .eq("digger_id", contractData.digger_id)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();
      bidId = bidRow.data?.id ?? null;
    }
    const gross = Number(milestone.amount);
    const diggerPayout = Number((milestone as any).digger_payout ?? milestone.amount);
    const giggerPaid = (pi.amount_received ?? 0) / 100;
    const transactionFeeAmount = Math.round(gross * 0.03 * 100) / 100;

    await supabase.from("transactions").insert({
      gig_id: contractData.gig_id,
      bid_id: bidId ?? null,
      consumer_id: contractData.consumer_id,
      digger_id: contractData.digger_id,
      total_amount: giggerPaid,
      commission_rate: 0.03,
      commission_amount: transactionFeeAmount,
      digger_payout: diggerPayout,
      status: "completed",
      completed_at: new Date().toISOString(),
      stripe_payment_intent_id: pi.id,
      escrow_contract_id: milestone.escrow_contract_id,
      milestone_payment_id: milestonePaymentId,
      is_escrow: false,
    });

    logStep("Milestone payment completed", { milestonePaymentId, piId: pi.id });
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    logStep("ERROR", { message: err instanceof Error ? err.message : String(err) });
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
