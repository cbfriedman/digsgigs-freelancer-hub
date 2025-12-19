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

    const { consentRecordId, code } = await req.json();

    if (!consentRecordId || !code) {
      return new Response(
        JSON.stringify({ error: "Missing consentRecordId or code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[VERIFY] Verifying code for consent record: ${consentRecordId}`);

    // Get the consent record
    const { data: consentRecord, error: fetchError } = await supabase
      .from("consent_records")
      .select("*")
      .eq("id", consentRecordId)
      .single();

    if (fetchError || !consentRecord) {
      console.error("[VERIFY] Consent record not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Consent record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already verified
    if (consentRecord.sms_verified) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Phone already verified",
          alreadyVerified: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if code matches
    if (consentRecord.sms_verification_code !== code) {
      console.log(`[VERIFY] Invalid code for record ${consentRecordId}`);
      return new Response(
        JSON.stringify({ error: "Invalid verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if code is expired (10 minutes)
    const createdAt = new Date(consentRecord.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (minutesSinceCreation > 10) {
      console.log(`[VERIFY] Code expired for record ${consentRecordId}`);
      return new Response(
        JSON.stringify({ error: "Verification code expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("consent_records")
      .update({
        sms_verified: true,
        sms_verified_at: new Date().toISOString(),
        sms_verification_code: null, // Clear the code
      })
      .eq("id", consentRecordId);

    if (updateError) {
      console.error("[VERIFY] Update error:", updateError);
      throw new Error("Failed to update verification status");
    }

    console.log(`[VERIFY] Successfully verified consent record: ${consentRecordId}`);

    // Now run DNC scrub and queue for calling
    try {
      // Trigger DNC scrub (async)
      await supabase.functions.invoke("dnc-scrub-phone", {
        body: { consentRecordId },
      });
    } catch (dncError) {
      console.error("[VERIFY] DNC scrub trigger failed:", dncError);
      // Don't fail the verification if DNC scrub fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone verified successfully. You will receive a call soon.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[VERIFY] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
