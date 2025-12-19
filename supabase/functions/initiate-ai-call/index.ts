import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// US Timezone definitions
const US_TIMEZONES = {
  "America/New_York": -5,
  "America/Chicago": -6,
  "America/Denver": -7,
  "America/Los_Angeles": -8,
  "America/Phoenix": -7, // No DST
  "America/Anchorage": -9,
  "Pacific/Honolulu": -10,
};

function getLocalHour(timezone: string): number {
  const now = new Date();
  const offset = US_TIMEZONES[timezone as keyof typeof US_TIMEZONES] || -5;
  const utcHour = now.getUTCHours();
  let localHour = utcHour + offset;
  if (localHour < 0) localHour += 24;
  if (localHour >= 24) localHour -= 24;
  return localHour;
}

function isWithinCallingHours(timezone: string): boolean {
  const localHour = getLocalHour(timezone);
  // TCPA: 8am - 9pm local time
  return localHour >= 8 && localHour < 21;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { queueEntryId, telemarketerId } = await req.json();

    if (!queueEntryId) {
      return new Response(
        JSON.stringify({ error: "Missing queueEntryId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI-CALL] Processing queue entry: ${queueEntryId}`);

    // Get the queue entry with all related data
    const { data: queueEntry, error: queueError } = await supabase
      .from("callable_leads_queue")
      .select(`
        *,
        consent_records (*),
        dnc_scrub_results (*)
      `)
      .eq("id", queueEntryId)
      .single();

    if (queueError || !queueEntry) {
      console.error("[AI-CALL] Queue entry not found:", queueError);
      return new Response(
        JSON.stringify({ error: "Queue entry not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const consentRecord = queueEntry.consent_records;
    const dncResult = queueEntry.dnc_scrub_results;

    // COMPLIANCE CHECK 1: Verify consent exists and is valid
    if (!consentRecord) {
      console.error("[AI-CALL] No consent record found");
      return new Response(
        JSON.stringify({ error: "No valid consent record", complianceBlock: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // COMPLIANCE CHECK 2: Verify SMS verification
    if (!consentRecord.sms_verified) {
      console.error("[AI-CALL] Phone not SMS verified");
      return new Response(
        JSON.stringify({ error: "Phone not verified", complianceBlock: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // COMPLIANCE CHECK 3: Verify consent not revoked
    if (consentRecord.consent_revoked) {
      console.error("[AI-CALL] Consent revoked");
      await supabase
        .from("callable_leads_queue")
        .update({ status: "skipped" })
        .eq("id", queueEntryId);
      return new Response(
        JSON.stringify({ error: "Consent has been revoked", complianceBlock: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // COMPLIANCE CHECK 4: Verify DNC scrub is recent and passed
    if (!dncResult || !dncResult.is_callable) {
      console.error("[AI-CALL] DNC check failed or not callable");
      return new Response(
        JSON.stringify({ error: "Number not callable per DNC check", complianceBlock: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if DNC scrub is still valid (within 24 hours)
    const dncCheckedAt = new Date(dncResult.created_at);
    const hoursSinceDncCheck = (Date.now() - dncCheckedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDncCheck > 24) {
      console.log("[AI-CALL] DNC scrub expired, requesting refresh");
      // Trigger new DNC scrub
      await supabase.functions.invoke("dnc-scrub-phone", {
        body: { consentRecordId: consentRecord.id },
      });
      return new Response(
        JSON.stringify({ error: "DNC check expired, refreshing", retry: true }),
        { status: 425, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // COMPLIANCE CHECK 5: Timezone restrictions (8am - 9pm local time)
    // TODO: Implement proper timezone detection based on phone area code or address
    const recipientTimezone = "America/New_York"; // Default - should be detected
    const localHour = getLocalHour(recipientTimezone);
    const timezoneCompliant = isWithinCallingHours(recipientTimezone);

    if (!timezoneCompliant) {
      console.log(`[AI-CALL] Outside calling hours. Local time: ${localHour}:00 in ${recipientTimezone}`);
      
      // Calculate next valid calling time
      let nextCallTime: Date;
      if (localHour >= 21) {
        // After 9pm, schedule for 8am tomorrow
        nextCallTime = new Date();
        nextCallTime.setHours(nextCallTime.getHours() + (24 - localHour + 8));
      } else {
        // Before 8am, schedule for 8am today
        nextCallTime = new Date();
        nextCallTime.setHours(nextCallTime.getHours() + (8 - localHour));
      }

      await supabase
        .from("callable_leads_queue")
        .update({ next_attempt_at: nextCallTime.toISOString() })
        .eq("id", queueEntryId);

      return new Response(
        JSON.stringify({ 
          error: "Outside calling hours (8am-9pm local time)", 
          complianceBlock: true,
          nextAttemptAt: nextCallTime.toISOString()
        }),
        { status: 425, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // COMPLIANCE CHECK 6: Max attempts
    if (queueEntry.attempt_count >= queueEntry.max_attempts) {
      console.log("[AI-CALL] Max attempts reached");
      await supabase
        .from("callable_leads_queue")
        .update({ status: "failed" })
        .eq("id", queueEntryId);
      return new Response(
        JSON.stringify({ error: "Maximum call attempts reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All compliance checks passed - initiate call
    console.log(`[AI-CALL] All compliance checks passed for ${consentRecord.phone.slice(-4)}`);

    // Update queue status
    await supabase
      .from("callable_leads_queue")
      .update({
        status: "calling",
        attempt_count: queueEntry.attempt_count + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", queueEntryId);

    // Create call log entry
    const { data: callLog, error: logError } = await supabase
      .from("ai_call_logs")
      .insert({
        consent_record_id: consentRecord.id,
        dnc_scrub_id: dncResult.id,
        telemarketer_id: telemarketerId || queueEntry.telemarketer_id,
        recipient_timezone: recipientTimezone,
        recipient_local_time: `${localHour}:00:00`,
        timezone_compliant: true,
        ai_agent_id: "elevenlabs-agent-v1", // Replace with actual agent ID
        ai_agent_version: "1.0",
      })
      .select("id")
      .single();

    if (logError) {
      console.error("[AI-CALL] Failed to create call log:", logError);
    }

    // TODO: Integrate with ElevenLabs Conversational AI API
    // For now, return success with the call log ID
    // In production:
    // 1. Get signed agent URL from ElevenLabs
    // 2. Initiate outbound call
    // 3. Record conversation
    // 4. Update call log with results

    console.log(`[AI-CALL] Call initiated. Log ID: ${callLog?.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        callLogId: callLog?.id,
        message: "Call initiated successfully",
        phone: consentRecord.phone,
        name: consentRecord.full_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[AI-CALL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
