import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEPRECATED: This function is no longer in use.
 * The escrow feature has been removed from the platform.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[DEPRECATED] confirm-escrow-payment called - feature discontinued");

  return new Response(
    JSON.stringify({ 
      error: "Feature discontinued - escrow is no longer available",
      message: "Please arrange payment directly with your contractor"
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400 
    }
  );
});
