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

    const { penaltyId, stripePaymentIntentId } = await req.json();
    
    if (!penaltyId) {
      throw new Error("Penalty ID is required");
    }

    // Get penalty details
    const { data: penalty, error: penaltyError } = await supabaseClient
      .from("withdrawal_penalties")
      .select(`
        *,
        bid:bids(id, status, digger_id)
      `)
      .eq("id", penaltyId)
      .single();

    if (penaltyError || !penalty) {
      throw new Error("Penalty record not found");
    }

    // Verify user owns this penalty
    const { data: diggerProfile } = await supabaseClient
      .from("digger_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!diggerProfile || diggerProfile.id !== penalty.digger_id) {
      throw new Error("Unauthorized: This penalty doesn't belong to you");
    }

    // Update penalty status (stripePaymentIntentId optional when client completes after redirect)
    const penaltyUpdate: { status: string; paid_at: string; stripe_payment_intent_id?: string } = {
      status: "paid",
      paid_at: new Date().toISOString()
    };
    if (stripePaymentIntentId) penaltyUpdate.stripe_payment_intent_id = stripePaymentIntentId;
    const { error: updatePenaltyError } = await supabaseClient
      .from("withdrawal_penalties")
      .update(penaltyUpdate)
      .eq("id", penaltyId);

    if (updatePenaltyError) {
      throw new Error(`Failed to update penalty: ${updatePenaltyError.message}`);
    }

    // Update bid status to withdrawn
    const { error: updateBidError } = await supabaseClient
      .from("bids")
      .update({
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
        withdrawal_penalty: penalty.penalty_amount
      })
      .eq("id", penalty.bid_id);

    if (updateBidError) {
      throw new Error(`Failed to update bid: ${updateBidError.message}`);
    }

    // Update gig status back to open
    const { data: bid } = await supabaseClient
      .from("bids")
      .select("gig_id")
      .eq("id", penalty.bid_id)
      .single();

    if (bid) {
      await supabaseClient
        .from("gigs")
        .update({
          status: "open",
          awarded_bid_id: null,
          awarded_digger_id: null,
        })
        .eq("id", bid.gig_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Bid withdrawn successfully. The gig is now open for new bids."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in process-withdrawal-payment:", error);
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