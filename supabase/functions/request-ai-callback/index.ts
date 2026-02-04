import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CallbackRequest {
  phone: string;
  name?: string;
  source?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[Request AI Callback] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const retellApiKey = Deno.env.get("RETELL_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const { phone, name, source } = await req.json() as CallbackRequest;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Callback request received", { phone: cleanPhone, name, source });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the callback request in the database
    const { data: callbackRecord, error: insertError } = await supabase
      .from("ai_callback_requests")
      .insert({
        phone: cleanPhone,
        name: name || "Guest",
        source: source || "unknown",
        status: "pending",
        scheduled_for: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
      })
      .select("id")
      .single();

    if (insertError) {
      // Table might not exist yet - log and continue
      logStep("Insert error (table may not exist)", { error: insertError.message });
    }

    // If Retell API key is configured, initiate the call
    if (retellApiKey) {
      logStep("Initiating Retell call", { phone: cleanPhone });

      const retellAgentId = Deno.env.get("RETELL_AGENT_ID");
      
      if (!retellAgentId) {
        logStep("Retell agent ID not configured - call queued for later");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Callback scheduled",
            callbackId: callbackRecord?.id 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const retellResponse = await fetch("https://api.retellai.com/v2/create-phone-call", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${retellApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_id: retellAgentId,
            to_number: `+1${cleanPhone}`,
            from_number: Deno.env.get("RETELL_FROM_NUMBER") || undefined,
            metadata: {
              callback_id: callbackRecord?.id,
              name: name || "Guest",
              source: source || "unknown",
            },
          }),
        });

        if (!retellResponse.ok) {
          const errorText = await retellResponse.text();
          logStep("Retell API error", { status: retellResponse.status, error: errorText });
          // Still return success - the callback is queued
        } else {
          const retellData = await retellResponse.json();
          logStep("Retell call initiated", { callId: retellData.call_id });

          // Update the callback record with the call ID
          if (callbackRecord?.id) {
            await supabase
              .from("ai_callback_requests")
              .update({ 
                retell_call_id: retellData.call_id,
                status: "initiated"
              })
              .eq("id", callbackRecord.id);
          }
        }
      } catch (retellError) {
        logStep("Retell call failed", { error: String(retellError) });
        // Continue - callback is still queued
      }
    } else {
      logStep("Retell API key not configured - callback queued for manual processing");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Callback scheduled - you'll receive a call within 5 minutes",
        callbackId: callbackRecord?.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Error processing callback request", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Failed to schedule callback" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
