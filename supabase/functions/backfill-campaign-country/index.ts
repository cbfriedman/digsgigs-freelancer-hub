import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isPrivateIp = (ip: string) =>
  !ip ||
  ip === "unknown" ||
  /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|::1)/.test(ip);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRoles } = await supabase
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", user.id)
      .eq("app_role", "admin")
      .eq("is_active", true);
    if (!adminRoles?.length) {
      return new Response(
        JSON.stringify({ error: "Admin required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rows that have IP but no country yet (limit 40 to respect ip-api.com 45/min)
    const { data: rows, error: selectError } = await supabase
      .from("campaign_conversions")
      .select("id, ip_address")
      .is("country_code", null)
      .not("ip_address", "is", null)
      .limit(40);

    if (selectError) {
      return new Response(
        JSON.stringify({ error: selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toProcess = (rows || []).filter((r) => r.ip_address && !isPrivateIp(r.ip_address));
    let updated = 0;

    for (const row of toProcess) {
      try {
        const res = await fetch(
          `http://ip-api.com/json/${encodeURIComponent(row.ip_address)}?fields=country,countryCode`
        );
        if (!res.ok) continue;
        const geo = await res.json();
        const countryCode = geo?.countryCode || null;
        const countryName = geo?.country || null;
        if (!countryCode && !countryName) continue;

        const { error: updateError } = await supabase
          .from("campaign_conversions")
          .update({ country_code: countryCode, country_name: countryName })
          .eq("id", row.id);

        if (!updateError) updated++;
      } catch (_) {
        // skip this row
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ success: true, updated, processed: toProcess.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
