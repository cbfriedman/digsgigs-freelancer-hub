import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VapiToolCallMessage {
  message: {
    type: string;
    toolCallList?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
    call?: {
      id: string;
      phoneNumber?: {
        number: string;
      };
    };
  };
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[vapi-call-webhook] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: VapiToolCallMessage = await req.json();
    logStep("Received Vapi webhook", { messageType: body.message?.type });

    // Handle tool-calls message type
    if (body.message?.type === "tool-calls" && body.message.toolCallList) {
      const toolCalls = body.message.toolCallList;
      const results = [];

      for (const toolCall of toolCalls) {
        if (toolCall.function.name === "update_gig_details") {
          const args = JSON.parse(toolCall.function.arguments);
          logStep("Processing update_gig_details", args);

          // Store the extracted data in session or return confirmation
          // The actual gig creation happens when isComplete = true
          
          if (args.isComplete) {
            logStep("Gig details complete, ready to create gig", args);
            
            // Here you could create the gig in the database
            // For now, we return success and let the assistant confirm with user
            
            results.push({
              toolCallId: toolCall.id,
              result: JSON.stringify({
                success: true,
                message: "All project details captured successfully. Ready to submit.",
                data: args
              })
            });
          } else {
            // Partial data - acknowledge receipt
            results.push({
              toolCallId: toolCall.id,
              result: JSON.stringify({
                success: true,
                message: "Details updated successfully.",
                fieldsReceived: Object.keys(args).filter(k => args[k] !== undefined && args[k] !== null)
              })
            });
          }
        }
      }

      // Return tool call results in Vapi format
      return new Response(
        JSON.stringify({ results }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Handle end-of-call-report for logging/analytics
    if (body.message?.type === "end-of-call-report") {
      logStep("Call ended", { callId: body.message.call?.id });
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default response for other message types
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Error processing webhook", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
