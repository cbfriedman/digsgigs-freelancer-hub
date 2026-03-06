/**
 * Retry the 7% deposit advance transfer for a paid first milestone when the initial
 * transfer failed (e.g. insufficient platform balance). Uses idempotency key so safe to call multiple times.
 * Call with service role or admin only.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getStripeConfig } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RETRY-7PCT-MILESTONE] ${step}${s}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const body = (await req.json()) as { milestone_payment_id?: string };
    const milestonePaymentId = body.milestone_payment_id;
    if (!milestonePaymentId) {
      return new Response(JSON.stringify({ error: "milestone_payment_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: milestone, error: mErr } = await supabaseAdmin
      .from("milestone_payments")
      .select("id, milestone_number, amount, status, stripe_transfer_id, escrow_contract_id, escrow_contracts!inner(digger_id, gig_id)")
      .eq("id", milestonePaymentId)
      .single();

    if (mErr || !milestone) {
      logStep("Milestone not found", { milestonePaymentId });
      return new Response(JSON.stringify({ error: "Milestone not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const contract = (milestone as any).escrow_contracts;
    if (Number((milestone as any).milestone_number) !== 1) {
      return new Response(JSON.stringify({ error: "Only first milestone (milestone_number 1) has 7% deposit advance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if ((milestone as any).status !== "paid") {
      return new Response(JSON.stringify({ error: "Milestone must be paid before retrying 7% transfer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if ((milestone as any).stripe_transfer_id) {
      logStep("7% already transferred (stripe_transfer_id set)", { stripe_transfer_id: (milestone as any).stripe_transfer_id });
      return new Response(JSON.stringify({ success: true, message: "7% was already transferred", stripe_transfer_id: (milestone as any).stripe_transfer_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let bidAmountForSevenPercent: number | null = null;
    const { data: depositRow } = await supabaseAdmin
      .from("gigger_deposits")
      .select("id, bid_id")
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
    if (bidAmountForSevenPercent == null) {
      return new Response(JSON.stringify({ error: "Could not resolve bid amount for 7%" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const depositAdvanceCents = Math.round(bidAmountForSevenPercent * 0.07 * 100);
    if (depositAdvanceCents <= 0) {
      return new Response(JSON.stringify({ success: true, message: "No 7% to transfer (zero amount)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("stripe_connect_account_id")
      .eq("id", contract.digger_id)
      .single();
    if (!diggerProfile?.stripe_connect_account_id) {
      return new Response(JSON.stringify({ error: "Digger has no Connect account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { secretKey } = await getStripeConfig(supabaseAdmin);
    if (!secretKey) throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY_TEST/LIVE in Edge Function secrets.");
    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
    const transfer = await stripe.transfers.create(
      {
        amount: depositAdvanceCents,
        currency: "usd",
        destination: diggerProfile.stripe_connect_account_id,
        description: "7% deposit advance (first milestone) – retry",
        metadata: {
          milestone_payment_id: milestonePaymentId,
          escrow_contract_id: milestone.escrow_contract_id,
          type: "milestone_7pct_deposit",
        },
      },
      { idempotencyKey: `milestone-7pct-${milestonePaymentId}` }
    );

    await supabaseAdmin
      .from("milestone_payments")
      .update({ stripe_transfer_id: transfer.id })
      .eq("id", milestonePaymentId);

    logStep("7% deposit advance transfer created (retry)", { transferId: transfer.id, depositAdvanceCents, milestonePaymentId });
    return new Response(
      JSON.stringify({
        success: true,
        stripe_transfer_id: transfer.id,
        amount_cents: depositAdvanceCents,
        message: "7% deposit advance transferred to digger",
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
