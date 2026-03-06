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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user?.email) throw new Error("User not authenticated");

    const { secretKey, mode } = await getStripeConfig(supabaseClient);
    if (!secretKey) throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY_TEST/LIVE in Edge Function secrets.");

    // Get digger profile
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from("digger_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });

    // Use test or live Connect account depending on platform mode
    const isLive = mode === "live";
    let accountId = isLive
      ? (diggerProfile as { stripe_connect_account_id_live?: string }).stripe_connect_account_id_live
      : diggerProfile.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Use registered email as display name so admins can identify accounts in Stripe Dashboard → Connected accounts
        business_profile: {
          name: user.email,
        },
      });

      accountId = account.id;

      const updatePayload = isLive
        ? { stripe_connect_account_id_live: accountId }
        : { stripe_connect_account_id: accountId };
      await supabaseClient
        .from("digger_profiles")
        .update(updatePayload)
        .eq("id", diggerProfile.id);
    } else {
      // Keep display name in sync with registered email for existing accounts (Stripe Dashboard → Connected accounts)
      await stripe.accounts.update(accountId, {
        business_profile: { name: user.email },
      });
    }

    // Base URL for return/refresh: prefer SITE_URL (env) so it works from any client (e.g. mobile or serverless).
    // Livemode requires HTTPS redirects; if origin is HTTP (e.g. localhost or preview), use SITE_URL or fallback.
    let baseUrl =
      Deno.env.get("SITE_URL")?.replace(/\/$/, "") ||
      req.headers.get("origin") ||
      "https://digsandgigs.net";
    if (isLive && baseUrl.startsWith("http://")) {
      const siteUrl = Deno.env.get("SITE_URL")?.replace(/\/$/, "");
      if (siteUrl && siteUrl.startsWith("https://")) {
        baseUrl = siteUrl;
      } else {
        throw new Error(
          "Livemode requests must use HTTPS. Set SITE_URL in Edge Function secrets to your production HTTPS URL (e.g. https://digsandgigs.com), or use the app from that URL."
        );
      }
    }
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/my-bids?refresh=true`,
      return_url: `${baseUrl}/my-bids?success=true`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const rawMessage =
      (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string")
        ? (error as { message: string }).message
        : error instanceof Error
          ? error.message
          : "Unknown error";
    // Stripe returns this when the platform account has not enabled Connect in the Dashboard (same mode: test or live).
    const isConnectNotEnabled =
      typeof rawMessage === "string" &&
      (rawMessage.includes("signed up for Connect") || rawMessage.includes("stripe.com/docs/connect"));
    const userMessage = isConnectNotEnabled
      ? "Payment setup is not complete yet. The platform needs to enable Stripe Connect in the Stripe Dashboard for the current mode: open Connect → Get started (use Test mode in Stripe if the app is in test mode, or Live if in live mode). Then try again or contact support."
      : rawMessage;
    return new Response(
      JSON.stringify({ error: userMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});