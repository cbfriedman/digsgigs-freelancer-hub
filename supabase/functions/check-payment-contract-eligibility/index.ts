import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
      .select("id, digger_id")
      .eq("id", bidId)
      .eq("gig_id", gigId)
      .single();

    if (!bid || bid.digger_id !== gig.awarded_digger_id) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "bid_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Gigger must have at least one payment method
    const { data: paymentMethods } = await supabaseAdmin
      .from("payment_methods")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    if (!paymentMethods?.length) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "payment_method_required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Digger must have Stripe Connect set up
    let { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("id, stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", gig.awarded_digger_id)
      .single();

    if (!diggerProfile?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "digger_payouts_not_set_up" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If our DB says not verified, sync from Stripe (webhook may be delayed or missing)
    if (!diggerProfile.stripe_connect_charges_enabled) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
          const account = await stripe.accounts.retrieve(diggerProfile.stripe_connect_account_id);
          const detailsSubmitted = !!account.details_submitted;
          const chargesEnabled = !!account.charges_enabled;
          await supabaseAdmin
            .from("digger_profiles")
            .update({
              stripe_connect_onboarded: detailsSubmitted,
              stripe_connect_charges_enabled: chargesEnabled,
            })
            .eq("id", diggerProfile.id);
          diggerProfile = { ...diggerProfile, stripe_connect_charges_enabled: chargesEnabled };
        } catch {
          // Stripe API error: keep DB as-is and return pending
        }
      }
    }

    if (!diggerProfile.stripe_connect_charges_enabled) {
      return new Response(
        JSON.stringify({ eligible: false, reason: "digger_payouts_pending_verification" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ eligible: true }),
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
