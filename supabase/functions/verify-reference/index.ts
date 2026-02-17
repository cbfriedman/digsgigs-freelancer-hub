import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const token = body?.token;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: row, error: fetchError } = await supabase
      .from("reference_verification_tokens")
      .select("id, reference_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (fetchError || !row) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired link" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (new Date(row.expires_at) < new Date()) {
      await supabase.from("reference_verification_tokens").delete().eq("id", row.id);
      return new Response(
        JSON.stringify({ success: false, error: "This link has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("references")
      .update({ is_verified: true, verification_tier: "email" })
      .eq("id", row.reference_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    await supabase.from("reference_verification_tokens").delete().eq("id", row.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
