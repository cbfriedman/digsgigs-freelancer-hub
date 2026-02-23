import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const body = await req.json().catch(() => ({}));
    const { consumerId, gigId } = body as { consumerId?: string; gigId?: string };
    // Require auth only when passing consumerId directly; gigId is safe (we only return two booleans for that gig's poster)
    if (consumerId && !req.headers.get("Authorization")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetConsumerId: string | null = null;
    if (consumerId) {
      targetConsumerId = consumerId;
    } else if (gigId) {
      const { data: gig, error } = await supabase
        .from("gigs")
        .select("consumer_id")
        .eq("id", gigId)
        .single();
      if (error || !gig?.consumer_id) {
        return new Response(
          JSON.stringify({ error: "Gig not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetConsumerId = gig.consumer_id;
    }

    if (!targetConsumerId) {
      return new Response(
        JSON.stringify({ error: "consumerId or gigId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(targetConsumerId);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({
          email_verified: false,
          social_verified: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const u = authData.user as { email_confirmed_at?: string | null; identities?: { provider: string }[]; raw_user_meta_data?: { provider?: string } };
    const email_verified = !!(u?.email_confirmed_at);
    const provider = u?.raw_user_meta_data?.provider ?? u?.identities?.[0]?.provider;
    const social_verified = !!(provider && provider !== "email");

    return new Response(
      JSON.stringify({ email_verified, social_verified }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-client-verification error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
