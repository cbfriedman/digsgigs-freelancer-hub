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

    const { gigId, confirmationCode } = await req.json();

    console.log("[VERIFY-LEAD-CONFIRMATION] Verifying gig:", gigId);

    // Fetch gig to check confirmation code
    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("*")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error(`Failed to fetch gig: ${gigError?.message}`);
    }

    // Check if code matches (stored temporarily in contact_preferences)
    const storedCode = gig.contact_preferences;
    
    if (storedCode !== confirmationCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid confirmation code" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Update gig status to confirmed
    const { error: updateError } = await supabaseClient
      .from("gigs")
      .update({
        confirmation_status: "confirmed",
        confirmed_at: new Date().toISOString(),
        is_confirmed_lead: true,
        contact_preferences: null, // Clear the temporary code
      })
      .eq("id", gigId);

    if (updateError) {
      throw new Error(`Failed to update gig: ${updateError.message}`);
    }

    console.log("[VERIFY-LEAD-CONFIRMATION] Gig confirmed successfully");

    // Trigger lead matching for non-exclusive leads
    // For exclusive leads, they should be manually verified before posting
    if (gig.lead_source === "non-exclusive") {
      const { error: matchError } = await supabaseClient.functions.invoke(
        "match-leads-to-diggers",
        {
          body: { gigId },
        }
      );

      if (matchError) {
        console.error("[VERIFY-LEAD-CONFIRMATION] Matching error:", matchError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Lead confirmed successfully",
        isExclusive: gig.lead_source === "exclusive"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[VERIFY-LEAD-CONFIRMATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});