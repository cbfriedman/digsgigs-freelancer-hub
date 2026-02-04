import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[Initiate Browser Call] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const retellApiKey = Deno.env.get("RETELL_API_KEY");
    const retellAgentId = Deno.env.get("RETELL_AGENT_ID");

    const { source } = await req.json();
    logStep("Browser call request received", { source });

    if (!retellApiKey || !retellAgentId) {
      logStep("Retell not configured - returning placeholder");
      return new Response(
        JSON.stringify({ 
          configured: false,
          message: "Voice calling is being set up. Please use the callback option for now."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a web call session with Retell
    const retellResponse = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${retellApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: retellAgentId,
        metadata: {
          source: source || "hire-a-pro",
          type: "browser_call",
        },
      }),
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      logStep("Retell web call error", { status: retellResponse.status, error: errorText });
      return new Response(
        JSON.stringify({ 
          configured: true,
          error: "Failed to initiate web call. Please try callback option."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const retellData = await retellResponse.json();
    logStep("Web call session created", { callId: retellData.call_id });

    return new Response(
      JSON.stringify({ 
        success: true,
        callUrl: retellData.web_call_link,
        callId: retellData.call_id,
        accessToken: retellData.access_token
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Error initiating browser call", { error: String(error) });
    return new Response(
      JSON.stringify({ error: "Failed to initiate call" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
