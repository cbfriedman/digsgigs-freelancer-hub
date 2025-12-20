import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEPRECATED: This function is no longer in use.
 * The telemarketer feature has been removed from the platform.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[DEPRECATED] calculate-telemarketer-commission called - feature discontinued");

  return new Response(
    JSON.stringify({ 
      error: "Feature discontinued - telemarketer commissions are no longer available",
      commissionAmount: 0
    }),
    { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400 
    }
  );
});
