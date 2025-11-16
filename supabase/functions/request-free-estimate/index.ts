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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { gigId, diggerId } = await req.json();
    
    if (!gigId || !diggerId) {
      throw new Error("Gig ID and Digger ID are required");
    }

    // Get gig details and verify user is the owner
    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("id, title, consumer_id")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error("Gig not found");
    }

    if (gig.consumer_id !== user.id) {
      throw new Error("Only the gig owner can request estimates");
    }

    // Check if estimate already requested
    const { data: existingRequest } = await supabaseClient
      .from("lead_purchases")
      .select("id, status")
      .eq("gig_id", gigId)
      .eq("digger_id", diggerId)
      .maybeSingle();

    if (existingRequest) {
      throw new Error("Estimate already requested from this digger");
    }

    // Verify digger offers free estimates
    const { data: diggerProfile } = await supabaseClient
      .from("digger_profiles")
      .select("offers_free_estimates")
      .eq("id", diggerId)
      .single();

    if (!diggerProfile?.offers_free_estimates) {
      throw new Error("This digger does not offer free estimates");
    }

    // Create pending lead purchase
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from("lead_purchases")
      .insert({
        gig_id: gigId,
        digger_id: diggerId,
        consumer_id: user.id,
        purchase_price: 100,
        amount_paid: 100,
        status: "pending", // Digger must pay to complete
      })
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Failed to create estimate request: ${purchaseError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Estimate requested! The digger will be notified to pay $100 to accept.",
        purchaseId: purchase.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in request-free-estimate:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});