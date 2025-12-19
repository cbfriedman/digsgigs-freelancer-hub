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

    const { consentRecordId } = await req.json();

    if (!consentRecordId) {
      return new Response(
        JSON.stringify({ error: "Missing consentRecordId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DNC-SCRUB] Processing consent record: ${consentRecordId}`);

    // Get the consent record
    const { data: consentRecord, error: fetchError } = await supabase
      .from("consent_records")
      .select("*")
      .eq("id", consentRecordId)
      .single();

    if (fetchError || !consentRecord) {
      console.error("[DNC-SCRUB] Consent record not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Consent record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phone = consentRecord.phone;

    // Check internal DNC list first
    const { data: internalDnc } = await supabase
      .from("internal_dnc_list")
      .select("id")
      .eq("phone", phone)
      .limit(1);

    const isInternalDnc = internalDnc && internalDnc.length > 0;

    // TODO: Integrate with actual DNC scrubbing APIs
    // For now, we'll simulate the checks
    // In production, integrate with:
    // - Federal DNC API: https://telemarketing.donotcall.gov/
    // - State DNC lists (varies by state)
    // - Reassigned Numbers Database (RND): https://www.reassignednumbers.com/

    const federalDncListed = false; // Simulate - replace with actual API call
    const stateDncListed = false; // Simulate - replace with actual API call
    const rndReassigned = false; // Simulate - replace with actual API call

    // Determine if callable
    const blockReasons: string[] = [];
    if (isInternalDnc) blockReasons.push("Internal DNC list");
    if (federalDncListed) blockReasons.push("Federal DNC list");
    if (stateDncListed) blockReasons.push("State DNC list");
    if (rndReassigned) blockReasons.push("Number reassigned (RND)");

    const isCallable = blockReasons.length === 0;
    const callableUntil = isCallable 
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      : null;

    console.log(`[DNC-SCRUB] Phone ${phone.slice(-4)}: ${isCallable ? "CALLABLE" : "BLOCKED - " + blockReasons.join(", ")}`);

    // Create DNC scrub result record
    const { data: scrubResult, error: insertError } = await supabase
      .from("dnc_scrub_results")
      .insert({
        consent_record_id: consentRecordId,
        phone,
        federal_dnc_checked_at: new Date().toISOString(),
        federal_dnc_listed: federalDncListed,
        state_dnc_checked_at: new Date().toISOString(),
        state_dnc_listed: stateDncListed,
        state_dnc_states_checked: ["ALL"], // Replace with actual states checked
        rnd_checked_at: new Date().toISOString(),
        rnd_reassigned: rndReassigned,
        internal_dnc_listed: isInternalDnc,
        is_callable: isCallable,
        callable_until: callableUntil,
        block_reason: blockReasons.length > 0 ? blockReasons.join("; ") : null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[DNC-SCRUB] Insert error:", insertError);
      throw new Error("Failed to store DNC scrub result");
    }

    // If callable, add to queue
    if (isCallable) {
      const { error: queueError } = await supabase
        .from("callable_leads_queue")
        .insert({
          consent_record_id: consentRecordId,
          dnc_scrub_id: scrubResult.id,
          telemarketer_id: consentRecord.telemarketer_id,
          status: "pending",
          priority: 5,
          next_attempt_at: new Date().toISOString(), // Ready to call immediately
        });

      if (queueError) {
        console.error("[DNC-SCRUB] Queue insert error:", queueError);
        // Don't fail - the scrub result is still valid
      } else {
        console.log(`[DNC-SCRUB] Added to callable queue: ${consentRecordId}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isCallable,
        blockReasons: blockReasons.length > 0 ? blockReasons : null,
        scrubResultId: scrubResult.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[DNC-SCRUB] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
