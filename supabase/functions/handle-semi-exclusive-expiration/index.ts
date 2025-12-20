import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEPRECATED: This function is no longer in use.
 * The semi-exclusive feature has been removed from the platform.
 * All leads are now non-exclusive only.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[DEPRECATED] handle-semi-exclusive-expiration called - feature discontinued");

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: "Feature discontinued - all leads are now non-exclusive",
      processed: 0 
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
