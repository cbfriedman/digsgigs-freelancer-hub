import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from("digger_profiles")
      .select("id, stripe_connect_account_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !diggerProfile) {
      return new Response(
        JSON.stringify({ error: "Digger profile not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const accountId = diggerProfile.stripe_connect_account_id;
    if (!accountId) {
      return new Response(
        JSON.stringify({
          synced: false,
          error: "no_connect_account",
          message: "You haven't connected a payout account yet. Use \"Connect payout account\" to set it up.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const account = await stripe.accounts.retrieve(accountId);
    const detailsSubmitted = !!account.details_submitted;
    const chargesEnabled = !!account.charges_enabled;

    const { error: updateError } = await supabaseClient
      .from("digger_profiles")
      .update({
        stripe_connect_onboarded: detailsSubmitted,
        stripe_connect_charges_enabled: chargesEnabled,
      })
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
