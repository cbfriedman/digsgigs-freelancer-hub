import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, method } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Missing phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone to E.164
    let normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length === 10) {
      normalizedPhone = `+1${normalizedPhone}`;
    } else if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = `+${normalizedPhone}`;
    }

    console.log(`[REVOKE] Processing opt-out for phone: ${normalizedPhone.slice(-4)}, method: ${method}`);

    // Find all consent records for this phone
    const { data: consentRecords, error: fetchError } = await supabase
      .from("consent_records")
      .select("id")
      .eq("phone", normalizedPhone)
      .eq("consent_revoked", false);

    if (fetchError) {
      console.error("[REVOKE] Fetch error:", fetchError);
      throw new Error("Failed to fetch consent records");
    }

    if (!consentRecords || consentRecords.length === 0) {
      console.log("[REVOKE] No active consent records found");
      // Still add to internal DNC to be safe
    }

    // Revoke all active consents
    if (consentRecords && consentRecords.length > 0) {
      const { error: updateError } = await supabase
        .from("consent_records")
        .update({
          consent_revoked: true,
          revoked_at: new Date().toISOString(),
          revocation_method: method || "web_form",
        })
        .eq("phone", normalizedPhone)
        .eq("consent_revoked", false);

      if (updateError) {
        console.error("[REVOKE] Update error:", updateError);
        throw new Error("Failed to revoke consent");
      }

      console.log(`[REVOKE] Revoked ${consentRecords.length} consent record(s)`);
    }

    // Remove from callable queue
    const consentIds = consentRecords?.map(c => c.id) || [];
    if (consentIds.length > 0) {
      await supabase
        .from("callable_leads_queue")
        .update({ status: "skipped" })
        .in("consent_record_id", consentIds);
    }

    // Add to internal DNC list
    const { error: dncError } = await supabase
      .from("internal_dnc_list")
      .upsert({
        phone: normalizedPhone,
        added_reason: `Consent revoked via ${method || "web_form"}`,
        source: method || "web_form",
      }, {
        onConflict: "phone",
      });

    if (dncError) {
      console.error("[REVOKE] DNC list error:", dncError);
      // Don't fail - the consent revocation is the critical part
    }

    console.log(`[REVOKE] Successfully processed opt-out for ${normalizedPhone.slice(-4)}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Your consent has been revoked. You will no longer receive calls from us.",
        revokedRecords: consentRecords?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[REVOKE] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
