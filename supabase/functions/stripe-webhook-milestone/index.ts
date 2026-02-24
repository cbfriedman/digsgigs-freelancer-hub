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
      .select("id, milestone_number, amount, digger_payout, description, status, stripe_payment_intent_id, escrow_contract_id, escrow_contracts!inner(digger_id, gig_id, consumer_id)")
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
    let diggerPayoutCents = Math.round(Number((milestone as any).digger_payout ?? milestone.amount) * 100);

    if (Number((milestone as any).milestone_number) === 1) {
      let addCents = 0;
      const { data: depositRow } = await supabase
        .from("gigger_deposits")
        .select("id, bid_id")
        .eq("gig_id", contract.gig_id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (depositRow?.bid_id) {
        const { data: bidRow } = await supabase.from("bids").select("amount").eq("id", depositRow.bid_id).single();
        if (bidRow?.amount != null) addCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
      }
      if (addCents === 0) {
        const { data: gigRow } = await supabase.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single();
        if (gigRow?.awarded_bid_id) {
          const { data: bidRow } = await supabase.from("bids").select("amount").eq("id", gigRow.awarded_bid_id).single();
          if (bidRow?.amount != null) addCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
          logStep("First milestone: using awarded_bid_id for 7% (deposit row not found)");
        }
      }
      if (addCents > 0) {
        diggerPayoutCents += addCents;
        logStep("Adding 7% deposit advance to first milestone transfer", { addCents, diggerPayoutCents });
      }
    }

    const { data: diggerProfile } = await supabase
      .from("digger_profiles")
      .select("stripe_connect_account_id")
      .eq("id", contract.digger_id)
      .single();

    // If the PaymentIntent was created with transfer_data (saved PM destination charge), Stripe already transferred that amount at capture. Only transfer the remainder (e.g. 7% deposit advance).
    const alreadyTransferredCents = (pi.transfer_data?.amount ?? 0) as number;
    const remainderCents = diggerPayoutCents - alreadyTransferredCents;

    let stripeTransferId: string | null = null;
    if (diggerProfile?.stripe_connect_account_id && remainderCents > 0) {
      try {
        const transfer = await stripe.transfers.create({
          amount: remainderCents,
          currency: "usd",
          destination: diggerProfile.stripe_connect_account_id,
          description: `Milestone - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
          metadata: {
            milestone_payment_id: milestonePaymentId,
            escrow_contract_id: milestone.escrow_contract_id,
          },
        });
        stripeTransferId = transfer.id;
        logStep("Transfer created (remainder only)", { transferId: transfer.id, remainderCents, alreadyTransferredCents });
      } catch (transferErr) {
        logStep("Transfer failed (e.g. insufficient platform balance for 7% advance)", {
          error: transferErr instanceof Error ? transferErr.message : String(transferErr),
        });
      }
    } else if (alreadyTransferredCents > 0) {
      logStep("Main amount already transferred via transfer_data", { alreadyTransferredCents });
    }

    await supabase
      .from("milestone_payments")
      .update({
        status: "paid",
        stripe_payment_intent_id: pi.id,
        ...(stripeTransferId && { stripe_transfer_id: stripeTransferId }),
        ...(diggerProfile?.stripe_connect_account_id && { released_at: new Date().toISOString() }),
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
    const diggerPayoutDollars = diggerPayoutCents / 100; // includes 7% deposit advance on first milestone
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
      digger_payout: diggerPayoutDollars,
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
