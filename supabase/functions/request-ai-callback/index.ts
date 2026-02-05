import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Morgan assistant ID for project intake
const VAPI_ASSISTANT_ID = "efb351af-09d6-4145-be8b-311c61f909f8";

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
    const vapiApiKey = Deno.env.get("VAPI_API_KEY");
    const vapiPhoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID");

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

    // Clean phone number - ensure E.164 format for US numbers
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `+1${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      cleanPhone = `+${cleanPhone}`;
    } else if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+${cleanPhone}`;
    }

    if (cleanPhone.length < 11) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Callback request received", { phone: cleanPhone.slice(0, 5) + '***', name, source });

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

    // If Vapi API key is configured, initiate the call
    if (vapiApiKey && vapiPhoneNumberId) {
      logStep("Initiating Vapi outbound call", { phone: cleanPhone.slice(0, 5) + '***' });

      try {
        const vapiResponse = await fetch("https://api.vapi.ai/call/phone", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assistantId: VAPI_ASSISTANT_ID,
            phoneNumberId: vapiPhoneNumberId,
            customer: {
              number: cleanPhone,
              name: name || "Guest",
            },
            assistantOverrides: {
              metadata: {
                callback_id: callbackRecord?.id,
                name: name || "Guest",
                source: source || "unknown",
              },
            },
          }),
        });

        if (!vapiResponse.ok) {
          const errorText = await vapiResponse.text();
          logStep("Vapi API error", { status: vapiResponse.status, error: errorText });
          // Still return success - the callback is queued
        } else {
          const vapiData = await vapiResponse.json();
          logStep("Vapi call initiated", { callId: vapiData.id });

          // Update the callback record with the call ID
          if (callbackRecord?.id) {
            await supabase
              .from("ai_callback_requests")
              .update({ 
                vapi_call_id: vapiData.id,
                status: "initiated"
              })
              .eq("id", callbackRecord.id);
          }
        }
      } catch (vapiError) {
        logStep("Vapi call failed", { error: String(vapiError) });
        // Continue - callback is still queued
      }
    } else {
      logStep("Vapi API not fully configured - callback queued for manual processing", {
        hasApiKey: !!vapiApiKey,
        hasPhoneNumberId: !!vapiPhoneNumberId,
      });
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
