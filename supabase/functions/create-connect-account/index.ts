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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user?.email) throw new Error("User not authenticated");

    // Get digger profile
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from("digger_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create or retrieve Stripe Connect account
    let accountId = diggerProfile.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: diggerProfile.business_name,
        },
      });

      accountId = account.id;

      // Save account ID to database
      await supabaseClient
        .from("digger_profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", diggerProfile.id);
    }

    // Base URL for return/refresh: prefer SITE_URL (env) so it works from any client (e.g. mobile or serverless)
    const baseUrl =
      Deno.env.get("SITE_URL")?.replace(/\/$/, "") ||
      req.headers.get("origin") ||
      "https://digsandgigs.net";
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
    // Stripe returns this when the platform account has not enabled Connect in the Dashboard
    const isConnectNotEnabled =
      typeof rawMessage === "string" &&
      (rawMessage.includes("signed up for Connect") || rawMessage.includes("stripe.com/docs/connect"));
    const userMessage = isConnectNotEnabled
      ? "Payment setup is not complete yet. The platform needs to enable Stripe Connect in the Stripe Dashboard (Connect → Get started). Please try again later or contact support."
      : rawMessage;
    return new Response(
      JSON.stringify({ error: userMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});