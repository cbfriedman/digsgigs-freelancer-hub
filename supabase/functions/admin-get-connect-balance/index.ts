import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";
import { getStripeConfig } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = { ...corsHeaders, ...(origin ? getCorsHeaders(origin) : {}) };

  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: adminRoles } = await supabaseAdmin
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", user.id)
      .eq("app_role", "admin")
      .eq("is_active", true);
    if (!adminRoles?.length) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { digger_id?: string };
    const diggerId = body.digger_id;
    if (!diggerId) {
      return new Response(JSON.stringify({ error: "digger_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: diggerProfile } = await supabaseAdmin
      .from("digger_profiles")
      .select("id, user_id, stripe_connect_account_id, stripe_connect_account_id_live")
      .eq("id", diggerId)
      .maybeSingle();

    if (!diggerProfile) {
      return new Response(JSON.stringify({ error: "Digger profile not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { secretKey, mode } = await getStripeConfig(supabaseAdmin);
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const isLive = mode === "live";
    const connectAccountId = isLive
      ? (diggerProfile as { stripe_connect_account_id_live?: string }).stripe_connect_account_id_live
      : diggerProfile.stripe_connect_account_id;

    if (!connectAccountId) {
      return new Response(
        JSON.stringify({
          error: "No Connect account",
          message: isLive ? "Digger has not connected payouts for live mode." : "Digger has not connected a payout account.",
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
    const balance = await stripe.balance.retrieve({ stripeAccount: connectAccountId });

    const toUsd = (list: { amount: number; currency: string }[]) => {
      const usd = list.find((b) => b.currency === "usd");
      return usd ? usd.amount / 100 : 0;
    };

    return new Response(
      JSON.stringify({
        digger_id: diggerId,
        connect_account_id: connectAccountId,
        mode,
        available_usd: toUsd(balance.available),
        pending_usd: toUsd(balance.pending),
        currency: "usd",
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
