import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { secretKey, mode: stripeMode } = await getStripeConfig(supabaseClient);
    if (!secretKey) throw new Error("Stripe not configured.");

    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from("digger_profiles")
      .select("id, stripe_connect_account_id, stripe_connect_account_id_live")
      .eq("user_id", user.id)
      .single();

    if (profileError || !diggerProfile) {
      return new Response(
        JSON.stringify({ error: "Digger profile not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const isLive = stripeMode === "live";
    const accountId = isLive ? (diggerProfile as any).stripe_connect_account_id_live : diggerProfile.stripe_connect_account_id;
    if (!accountId) {
      return new Response(
        JSON.stringify({
          synced: false,
          error: "no_connect_account",
          message: isLive
            ? "You haven't connected a payout account for live payments yet. Use \"Connect payout account\" while the platform is in live mode."
            : "You haven't connected a payout account yet. Use \"Connect payout account\" to set it up.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
    const account = await stripe.accounts.retrieve(accountId);
    const detailsSubmitted = !!account.details_submitted;
    const chargesEnabled = !!account.charges_enabled;
    const payoutsEnabled = !!account.payouts_enabled;
    // Some countries are transfer-only for Connect. Treat payouts_enabled as payout-ready as well.
    const canReceivePayments = chargesEnabled || payoutsEnabled;

    const updatePayload = isLive
      ? { stripe_connect_onboarded_live: detailsSubmitted, stripe_connect_charges_enabled_live: canReceivePayments }
      : { stripe_connect_onboarded: detailsSubmitted, stripe_connect_charges_enabled: canReceivePayments };
    const { error: updateError } = await supabaseClient
      .from("digger_profiles")
      .update(updatePayload)
      .eq("id", diggerProfile.id);

    if (updateError) {
      console.error("sync-connect-status: failed to update digger_profiles", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save status" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        synced: true,
        details_submitted: detailsSubmitted,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        can_receive_payments: canReceivePayments,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-connect-status error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
