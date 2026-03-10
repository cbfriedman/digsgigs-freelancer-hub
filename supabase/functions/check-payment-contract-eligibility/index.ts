import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { getStripeConfig } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    const { gigId, bidId } = (await req.json()) as { gigId: string; bidId: string };

    if (!gigId || !bidId) {
      throw new Error("Missing gigId or bidId");
    }

    const { data: gig, error: gigError } = await supabaseAdmin
      .from("gigs")
      .select("id, consumer_id, awarded_digger_id, awarded_bid_id")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "gig_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    if (gig.consumer_id !== user.id) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "not_gig_owner" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    if (gig.awarded_bid_id !== bidId || !gig.awarded_digger_id) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "bid_not_awarded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { data: bid } = await supabaseAdmin
      .from("bids")
      .select("id, digger_id, amount, pricing_model")
      .eq("id", bidId)
      .eq("gig_id", gigId)
      .single();

    if (!bid || bid.digger_id !== gig.awarded_digger_id) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "bid_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // For exclusive gigs with paid deposit: milestone total = bid - deposit
    let milestoneTotal = bid.amount;
    if (bid.pricing_model === "success_based") {
      const { data: paidDeposit } = await supabaseAdmin
        .from("gigger_deposits")
        .select("deposit_amount_cents")
        .eq("bid_id", bidId)
        .eq("status", "paid")
        .maybeSingle();
      if (paidDeposit?.deposit_amount_cents != null) {
        const depositAmount = paidDeposit.deposit_amount_cents / 100;
        milestoneTotal = Math.max(0, bid.amount - depositAmount);
      }
    }

    // Payment method optional: gigger can approve milestones via Checkout

    // Digger must have Stripe Connect set up for the current platform mode (test vs live) OR alternative payout
    const { secretKey: stripeKeyForMode, mode: stripeMode } = await getStripeConfig(supabaseAdmin);
    const isLive = stripeMode === "live";
    let { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_account_id_live, stripe_connect_charges_enabled_live, payout_provider, payout_email, payout_external_id")
      .eq("id", gig.awarded_digger_id)
      .single();

    const alternativePayoutSet =
      ["paypal", "payoneer", "wise"].includes((diggerProfile as any)?.payout_provider ?? "") &&
      !!((diggerProfile as any)?.payout_email?.trim() || (diggerProfile as any)?.payout_external_id?.trim());

    const connectAccountId = isLive ? (diggerProfile as any)?.stripe_connect_account_id_live : diggerProfile?.stripe_connect_account_id;
    let canReceivePayments = !!(isLive ? (diggerProfile as any)?.stripe_connect_charges_enabled_live : diggerProfile?.stripe_connect_charges_enabled);

    if (!connectAccountId && !alternativePayoutSet) {
      const hasOtherMode = isLive ? !!diggerProfile?.stripe_connect_account_id : !!(diggerProfile as any)?.stripe_connect_account_id_live;
      return new Response(
        JSON.stringify({
          eligible: false,
          reason: hasOtherMode ? "digger_payouts_wrong_mode" : "digger_payouts_not_set_up",
          bidAmount: bid.amount,
          milestoneTotal,
          message: hasOtherMode
            ? (isLive
                ? "The professional connected payouts for Sandbox only. Switch the platform to Sandbox (Admin → Stripe mode), or ask them to connect for Live."
                : "The professional connected payouts for Live only. Switch the platform to Live (Admin → Stripe mode), or ask them to connect again with the platform in Sandbox.")
            : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (alternativePayoutSet) {
      return new Response(
        JSON.stringify({
          eligible: true,
          bidAmount: bid.amount,
          milestoneTotal,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If our DB says not verified, sync from Stripe (webhook may be delayed or missing)
    if (connectAccountId && !canReceivePayments) {
      try {
        if (stripeKeyForMode) {
          const stripe = new Stripe(stripeKeyForMode, { apiVersion: "2023-10-16" });
          const account = await stripe.accounts.retrieve(connectAccountId);
          const detailsSubmitted = !!account.details_submitted;
          const chargesEnabled = !!account.charges_enabled;
          const payoutsEnabled = !!account.payouts_enabled;
          canReceivePayments = chargesEnabled || payoutsEnabled || (stripeMode === "test" && detailsSubmitted);
          const updatePayload = isLive
            ? { stripe_connect_onboarded_live: detailsSubmitted, stripe_connect_charges_enabled_live: canReceivePayments }
            : { stripe_connect_onboarded: detailsSubmitted, stripe_connect_charges_enabled: canReceivePayments };
          await supabaseAdmin.from("digger_profiles").update(updatePayload).eq("id", diggerProfile.id);
          diggerProfile = { ...diggerProfile, ...(isLive ? { stripe_connect_charges_enabled_live: canReceivePayments } : { stripe_connect_charges_enabled: canReceivePayments }) };
        }
      } catch {
        // Stripe API error: keep DB as-is and return pending
      }
    }

    if (!canReceivePayments) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "digger_payouts_pending_verification", bidAmount: bid.amount, milestoneTotal }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        eligible: true,
        bidAmount: bid.amount,
        milestoneTotal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
