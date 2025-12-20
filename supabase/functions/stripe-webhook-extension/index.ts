import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

/**
 * DEPRECATED: This function is no longer in use.
 * The exclusivity extension feature has been removed from the platform.
 * All leads are now non-exclusive only.
 */
serve(async (req) => {
  console.log("[DEPRECATED] stripe-webhook-extension called - feature discontinued");

  return new Response(
    JSON.stringify({ received: true, message: "Feature discontinued" }),
    { headers: { "Content-Type": "application/json" } }
  );
});
