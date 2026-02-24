import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CONFIRM-MILESTONE-SESSION] ${step}${detailsStr}`);
};

/**
 * Fallback when webhook didn't run: confirm a Stripe checkout session for milestone
 * and update milestone_payments + insert transaction. Idempotent.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { session_id: sessionId } = (await req.json()) as { session_id?: string };
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "session_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Fetching Stripe session", { sessionId });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: "Session not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (session.payment_status !== "paid") {
      logStep("Session not paid", { payment_status: session.payment_status });
      return new Response(
        JSON.stringify({ success: false, reason: "not_paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.metadata?.type !== "milestone_payment") {
      logStep("Not a milestone payment session", { type: session.metadata?.type });
      return new Response(
        JSON.stringify({ success: false, reason: "not_milestone" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const milestonePaymentId = session.metadata.milestone_payment_id as string;
    const escrowContractId = session.metadata.escrow_contract_id as string;
    const consumerId = session.metadata.consumer_id as string;
    const diggerId = session.metadata.digger_id as string;
    const gigId = session.metadata.gig_id as string;

    if (!milestonePaymentId || !escrowContractId || !diggerId || !gigId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing milestone metadata" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: milestone, error: mErr } = await supabaseClient
      .from("milestone_payments")
      .select("id, milestone_number, amount, digger_payout, status, stripe_payment_intent_id")
      .eq("id", milestonePaymentId)
      .single();

    if (mErr || !milestone) {
      logStep("Milestone not found", { milestonePaymentId, error: mErr?.message });
      return new Response(
        JSON.stringify({ success: false, error: "Milestone not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (milestone.status === "paid" && milestone.stripe_payment_intent_id) {
      logStep("Milestone already paid (idempotent)", { milestonePaymentId });
      return new Response(
        JSON.stringify({ success: true, alreadyCompleted: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentIntentId = session.payment_intent as string;
    const completedAt = new Date().toISOString();

    await supabaseClient
      .from("milestone_payments")
      .update({
        status: "paid",
        stripe_payment_intent_id: paymentIntentId,
        released_at: completedAt,
      })
      .eq("id", milestonePaymentId);

    logStep("Milestone marked paid");

    let bidId = (await supabaseClient.from("gigs").select("awarded_bid_id").eq("id", gigId).single()).data?.awarded_bid_id;
    let diggerPayout = Number(milestone.digger_payout);
    let depositAdvanceCents = 0;
    if (Number(milestone.milestone_number) === 1) {
      const { data: depositRow } = await supabaseClient
        .from("gigger_deposits")
        .select("id, bid_id")
        .eq("gig_id", gigId)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (depositRow?.bid_id) {
        const { data: bidRow } = await supabaseClient.from("bids").select("amount").eq("id", depositRow.bid_id).single();
        if (bidRow?.amount != null) depositAdvanceCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
      }
      if (depositAdvanceCents === 0) {
        const { data: gigRow } = await supabaseClient.from("gigs").select("awarded_bid_id").eq("id", gigId).single();
        if (gigRow?.awarded_bid_id) {
          const { data: bidRow } = await supabaseClient.from("bids").select("amount").eq("id", gigRow.awarded_bid_id).single();
          if (bidRow?.amount != null) depositAdvanceCents = Math.round(Number(bidRow.amount) * 0.07 * 100);
        }
      }
      if (depositAdvanceCents > 0) {
        diggerPayout += depositAdvanceCents / 100;
        logStep("Added 7% deposit advance to digger_payout", { diggerPayout });
      }
    }
    if (!bidId) {
      const bidRow = await supabaseClient
        .from("bids")
        .select("id")
        .eq("gig_id", gigId)
        .eq("digger_id", diggerId)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();
      bidId = bidRow.data?.id ?? null;
    }

    const amountCents = Math.round(Number(milestone.amount) * 100);
    const transactionFeeCents = Math.round(amountCents * 0.03);
    const { error: txErr } = await supabaseClient.from("transactions").insert({
      gig_id: gigId,
      bid_id: bidId ?? null,
      consumer_id: consumerId,
      digger_id: diggerId,
      total_amount: (amountCents + transactionFeeCents) / 100,
      commission_rate: 0.03,
      commission_amount: transactionFeeCents / 100,
      digger_payout: diggerPayout,
      status: "completed",
      completed_at: completedAt,
      stripe_payment_intent_id: paymentIntentId,
      escrow_contract_id: escrowContractId,
      milestone_payment_id: milestonePaymentId,
      is_escrow: false,
    });

    if (txErr) {
      logStep("Failed to insert transaction", { error: txErr.message });
    } else {
      logStep("Transaction inserted", { total_amount: (amountCents + transactionFeeCents) / 100, completed_at: completedAt });
    }

    if (depositAdvanceCents > 0) {
      const { data: diggerProfile } = await supabaseClient
        .from("digger_profiles")
        .select("stripe_connect_account_id")
        .eq("id", diggerId)
        .single();
      if (diggerProfile?.stripe_connect_account_id) {
        try {
          const transfer = await stripe.transfers.create(
            {
              amount: depositAdvanceCents,
              currency: "usd",
              destination: diggerProfile.stripe_connect_account_id,
              description: "7% deposit advance (first milestone)",
              metadata: {
                milestone_payment_id: milestonePaymentId,
                escrow_contract_id: escrowContractId,
                type: "milestone_7pct_deposit",
              },
            },
            { idempotencyKey: `milestone-7pct-${milestonePaymentId}` }
          );
          logStep("7% deposit advance transferred to digger", { transferId: transfer.id });
        } catch (e) {
          logStep("Failed to create 7% transfer (webhook or retry-7pct-milestone)", { error: e instanceof Error ? e.message : String(e) });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
