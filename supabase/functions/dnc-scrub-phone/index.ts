import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEPRECATED: This function is no longer in use.
 * The telemarketer/DNC scrubbing feature has been removed from the platform.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[DEPRECATED] dnc-scrub-phone called - feature discontinued");

  return new Response(
    JSON.stringify({ 
      error: "Feature discontinued - DNC scrubbing is no longer available"
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400 
    }
  );
});
