import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEPRECATED: This function is no longer in use.
 * The exclusivity extension feature has been removed from the platform.
 * All leads are now non-exclusive only.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[DEPRECATED] create-extension-checkout called - feature discontinued");

  return new Response(
    JSON.stringify({ 
      error: "Feature discontinued - exclusivity extensions are no longer available",
      message: "All leads are now non-exclusive only"
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400 
    }
  );
});
