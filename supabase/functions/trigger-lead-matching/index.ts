import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { record } = await req.json();
    
    if (!record || !record.id) {
      throw new Error("Invalid webhook payload");
    }

    console.log(`[TRIGGER-LEAD-MATCHING] New gig created: ${record.id}`);

    // Call the match-leads-to-diggers function
    const { data, error } = await supabaseClient.functions.invoke(
      "match-leads-to-diggers",
      {
        body: { gigId: record.id },
      }
    );

    if (error) {
      console.error("[TRIGGER-LEAD-MATCHING] Error:", error);
      throw error;
    }

    console.log("[TRIGGER-LEAD-MATCHING] Matching complete:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TRIGGER-LEAD-MATCHING] ERROR:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
