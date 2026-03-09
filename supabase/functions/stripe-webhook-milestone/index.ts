import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { verifyWebhookAndGetStripeContextAsync } from "../_shared/stripe.ts";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    const ctx = await verifyWebhookAndGetStripeContextAsync(body, signature, "STRIPE_WEBHOOK_MILESTONE_SECRET");
    if (!ctx) {
      logStep("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const { event } = ctx;
    const stripe = new Stripe(ctx.secretKey, { apiVersion: "2023-10-16" });

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
      .select("stripe_connect_account_id, stripe_connect_account_id_live, payout_provider, payout_email")
      .eq("id", contract.digger_id)
      .single();
    const isLive = ctx.mode === "live";
    const connectAccountId = isLive ? (diggerProfile as any)?.stripe_connect_account_id_live : diggerProfile?.stripe_connect_account_id;
    const useAlternativePayout = ["paypal", "payoneer", "wise"].includes((diggerProfile as any)?.payout_provider ?? "");
    const alreadyTransferredCents = (pi.transfer_data?.amount ?? 0) as number;
    const isPlatformOnlyCharge = alreadyTransferredCents === 0;

    if (useAlternativePayout && isPlatformOnlyCharge) {
      if ((diggerProfile as any)?.payout_provider === "paypal") {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const payoutUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/paypal-payout`;
        try {
          const payoutRes = await fetch(payoutUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRole}` },
            body: JSON.stringify({ milestonePaymentId, stripePaymentIntentId: pi.id }),
          });
          const payoutData = (await payoutRes.json()) as { success?: boolean; error?: string; alreadyCompleted?: boolean };
          if (!payoutRes.ok || (!payoutData.success && !payoutData.alreadyCompleted)) {
            logStep("PayPal payout failed in webhook", { error: payoutData?.error, status: payoutRes.status });
          } else {
            logStep("PayPal payout completed (webhook)", { milestonePaymentId });
          }
        } catch (e) {
          logStep("Failed to invoke paypal-payout", { error: e instanceof Error ? e.message : String(e) });
        }
      } else {
        await supabase
          .from("milestone_payments")
          .update({
            status: "paid",
            stripe_payment_intent_id: pi.id,
            released_at: new Date().toISOString(),
          })
          .eq("id", milestonePaymentId);
        const contractData = contract as { digger_id: string; gig_id: string; consumer_id: string };
        let bidId = (await supabase.from("gigs").select("awarded_bid_id").eq("id", contractData.gig_id).single()).data?.awarded_bid_id;
        if (!bidId) {
          const bidRow = await supabase.from("bids").select("id").eq("gig_id", contractData.gig_id).eq("digger_id", contractData.digger_id).eq("status", "accepted").limit(1).maybeSingle();
          bidId = bidRow.data?.id ?? null;
        }
        const diggerPayoutDollars = diggerPayoutCents / 100;
        const gross = Number(milestone.amount);
        const transactionFeeAmount = Math.round(gross * 0.03 * 100) / 100;
        const giggerPaid = (pi.amount_received ?? 0) / 100;
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
        logStep("Payoneer/Wise: milestone marked paid (webhook)", { milestonePaymentId });
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const remainderCents = diggerPayoutCents - alreadyTransferredCents;
    let stripeTransferId: string | null = null;
    if (connectAccountId && remainderCents > 0) {
      try {
        const transfer = await stripe.transfers.create(
          {
            amount: remainderCents,
            currency: "usd",
            destination: connectAccountId,
            description: Number((milestone as any).milestone_number) === 1
              ? "7% deposit advance (first milestone)"
              : `Milestone - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
            metadata: {
              milestone_payment_id: milestonePaymentId,
              escrow_contract_id: milestone.escrow_contract_id,
              type: "milestone_7pct_deposit",
            },
          },
          { idempotencyKey: `milestone-7pct-${milestonePaymentId}` }
        );
        stripeTransferId = transfer.id;
        logStep("7% deposit advance (remainder) transferred to digger", { transferId: transfer.id, remainderCents, alreadyTransferredCents });
      } catch (transferErr: unknown) {
        const err = transferErr as { message?: string; code?: string };
        logStep("7% deposit advance transfer failed (platform balance may be unavailable; retry with same idempotency key)", {
          error: err?.message ?? String(transferErr),
          code: err?.code,
          remainderCents,
          milestonePaymentId,
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
        ...(connectAccountId && { released_at: new Date().toISOString() }),
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
