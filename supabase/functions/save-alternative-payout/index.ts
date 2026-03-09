import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_PROVIDERS = ["stripe", "paypal", "payoneer", "wise"] as const;

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
    if (!user?.id) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const body = (await req.json()) as { provider?: string; email?: string; externalId?: string };
    const provider = body.provider?.toLowerCase().trim();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const externalId = typeof body.externalId === "string" ? body.externalId.trim() : null;

    if (!provider || !VALID_PROVIDERS.includes(provider as any)) {
      return new Response(
        JSON.stringify({ error: "Invalid provider. Use stripe, paypal, payoneer, or wise." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (provider === "stripe") {
      const { error: updateError } = await supabaseClient
        .from("digger_profiles")
        .update({
          payout_provider: "stripe",
          payout_email: null,
          payout_external_id: null,
        })
        .eq("user_id", user.id);
      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message ?? "Failed to switch to Stripe" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      return new Response(
        JSON.stringify({ success: true, provider: "stripe" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (provider === "paypal" && !email) {
      return new Response(
        JSON.stringify({ error: "PayPal email is required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: digger, error: fetchError } = await supabaseClient
      .from("digger_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !digger) {
      return new Response(
        JSON.stringify({ error: "Digger profile not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      payout_provider: provider,
      payout_email: email || null,
      payout_external_id: externalId || null,
    };

    const { error: updateError } = await supabaseClient
      .from("digger_profiles")
      .update(updatePayload)
      .eq("id", digger.id);

    if (updateError) {
      console.error("save-alternative-payout update error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message ?? "Failed to save payout method" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-alternative-payout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
