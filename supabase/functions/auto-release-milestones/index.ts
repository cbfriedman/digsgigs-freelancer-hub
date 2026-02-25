import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRANSACTION_FEE_PERCENT = 3;
const DEFAULT_AUTO_RELEASE_DAYS = 14;
const MIN_DAYS = 7;
const MAX_DAYS = 60;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[AUTO-RELEASE-MILESTONES] ${step}${s}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== serviceRoleKey) {
      logStep("Unauthorized: requires service role");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
      { auth: { persistSession: false } }
    );
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });

    const { data: settingsRow } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "milestone_auto_release_days")
      .maybeSingle();
    const rawDays = (settingsRow?.value as { days?: number } | null)?.days;
    const autoReleaseDays = Math.min(
      MAX_DAYS,
      Math.max(MIN_DAYS, typeof rawDays === "number" && Number.isFinite(rawDays) ? Math.round(rawDays) : DEFAULT_AUTO_RELEASE_DAYS)
    );
    logStep("Using auto-release period (days)", { autoReleaseDays });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - autoReleaseDays);
    const cutoffIso = cutoff.toISOString();

    const { data: milestones, error: fetchError } = await supabaseAdmin
      .from("milestone_payments")
      .select("id, milestone_number, amount, digger_payout, description, escrow_contract_id, escrow_contracts!inner(consumer_id, digger_id, gig_id)")
      .eq("status", "submitted")
      .lt("submitted_at", cutoffIso)
      .order("submitted_at", { ascending: true });

    if (fetchError) {
      logStep("Fetch submitted milestones failed", { error: fetchError.message });
      throw new Error(fetchError.message);
    }

    if (!milestones?.length) {
      logStep("No milestones eligible for auto-release", { cutoff: cutoffIso });
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No milestones eligible for auto-release." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Found milestones for auto-release", { count: milestones.length, ids: milestones.map((m) => m.id) });

    let released = 0;
    let skipped = 0;

    for (const milestone of milestones) {
      const contract = (milestone as any).escrow_contracts;
      if (!contract) {
        skipped++;
        continue;
      }
      const milestonePaymentId = milestone.id;

      const { data: defaultPm } = await supabaseAdmin
        .from("payment_methods")
        .select("stripe_payment_method_id, stripe_customer_id")
        .eq("user_id", contract.consumer_id)
        .eq("is_default", true)
        .limit(1)
        .single();

      if (!defaultPm?.stripe_payment_method_id || !defaultPm?.stripe_customer_id) {
        logStep("Skip: no default payment method", { milestonePaymentId, consumerId: contract.consumer_id });
        skipped++;
        continue;
      }

      const { data: diggerProfile } = await supabaseAdmin
        .from("digger_profiles")
        .select("stripe_connect_account_id")
        .eq("id", contract.digger_id)
        .single();

      if (!diggerProfile?.stripe_connect_account_id) {
        logStep("Skip: digger has no Connect account", { milestonePaymentId });
        skipped++;
        continue;
      }

      const amountCents = Math.round(Number(milestone.amount) * 100);
      const transactionFeeCents = Math.round(amountCents * (TRANSACTION_FEE_PERCENT / 100));
      let diggerPayoutCents = Math.round(Number(milestone.digger_payout) * 100);
      let depositAdvanceCents = 0;
      const isFirstMilestone = Number((milestone as any).milestone_number) === 1;

      if (isFirstMilestone) {
        let bidAmountForSevenPercent: number | null = null;
        const { data: depositRow } = await supabaseAdmin
          .from("gigger_deposits")
          .select("bid_id")
          .eq("gig_id", contract.gig_id)
          .eq("status", "paid")
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (depositRow?.bid_id) {
          const { data: bidRow } = await supabaseAdmin.from("bids").select("amount").eq("id", depositRow.bid_id).single();
          if (bidRow?.amount != null) bidAmountForSevenPercent = Number(bidRow.amount);
        }
        if (bidAmountForSevenPercent == null) {
          const { data: gigRow } = await supabaseAdmin.from("gigs").select("awarded_bid_id").eq("id", contract.gig_id).single();
          if (gigRow?.awarded_bid_id) {
            const { data: bidRow } = await supabaseAdmin.from("bids").select("amount").eq("id", gigRow.awarded_bid_id).single();
            if (bidRow?.amount != null) bidAmountForSevenPercent = Number(bidRow.amount);
          }
        }
        if (bidAmountForSevenPercent != null) {
          depositAdvanceCents = Math.round(bidAmountForSevenPercent * 0.07 * 100);
          diggerPayoutCents += depositAdvanceCents;
        }
      }

      const totalChargeCents = amountCents + transactionFeeCents;
      const transferFromThisPaymentCents = diggerPayoutCents - depositAdvanceCents;

      const idempotencyKey = `auto-release-milestone-${milestonePaymentId}`;
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: totalChargeCents,
        currency: "usd",
        customer: defaultPm.stripe_customer_id,
        payment_method: defaultPm.stripe_payment_method_id,
        confirm: true,
        off_session: true,
        description: `Auto-release milestone - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
        metadata: {
          type: "milestone",
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
          consumer_id: contract.consumer_id,
          digger_id: contract.digger_id,
          gig_id: contract.gig_id,
          auto_released: "true",
        },
      };
      if (diggerProfile.stripe_connect_account_id && transferFromThisPaymentCents > 0) {
        paymentIntentParams.transfer_data = {
          destination: diggerProfile.stripe_connect_account_id,
          amount: transferFromThisPaymentCents,
        };
      }

      let paymentIntent: Stripe.PaymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, { idempotencyKey });
      } catch (piErr: unknown) {
        const err = piErr as { code?: string; message?: string };
        logStep("Payment failed for milestone (skip)", {
          milestonePaymentId,
          code: err?.code,
          message: err?.message ?? String(piErr),
        });
        skipped++;
        continue;
      }

      if (paymentIntent.status === "requires_action") {
        logStep("Payment requires action (skip; gigger must approve manually)", { milestonePaymentId });
        skipped++;
        continue;
      }

      if (paymentIntent.status !== "succeeded") {
        logStep("Payment did not succeed", { milestonePaymentId, status: paymentIntent.status });
        skipped++;
        continue;
      }

      let stripeTransferId: string | null = null;
      if (diggerProfile.stripe_connect_account_id && depositAdvanceCents > 0) {
        try {
          const transfer = await stripe.transfers.create(
            {
              amount: depositAdvanceCents,
              currency: "usd",
              destination: diggerProfile.stripe_connect_account_id,
              description: `Milestone 7% deposit advance (auto-release) - ${(milestone as any).description?.slice(0, 50) || "Contract milestone"}`,
              metadata: {
                milestone_payment_id: milestonePaymentId,
                escrow_contract_id: milestone.escrow_contract_id,
                type: "milestone_7pct_deposit",
              },
            },
            { idempotencyKey: `milestone-7pct-${milestonePaymentId}` }
          );
          stripeTransferId = transfer.id;
        } catch (_) {
          // Log but don't fail the milestone
        }
      }

      await supabaseAdmin
        .from("milestone_payments")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntent.id,
          ...(stripeTransferId && { stripe_transfer_id: stripeTransferId }),
          released_at: new Date().toISOString(),
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
        total_amount: totalChargeCents / 100,
        commission_rate: TRANSACTION_FEE_PERCENT / 100,
        commission_amount: transactionFeeCents / 100,
        digger_payout: diggerPayoutCents / 100,
        status: "completed",
        completed_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent.id,
        escrow_contract_id: milestone.escrow_contract_id,
        milestone_payment_id: milestonePaymentId,
        is_escrow: false,
      });

      released++;
      logStep("Auto-released milestone", { milestonePaymentId, piId: paymentIntent.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: milestones.length,
        released,
        skipped,
        message: `Auto-release complete: ${released} released, ${skipped} skipped.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
