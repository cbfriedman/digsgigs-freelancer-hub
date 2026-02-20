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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { bidId, gigId, diggerId, reason } = await req.json();

    if (!bidId || !gigId || !diggerId) {
      throw new Error("bidId, gigId, and diggerId are required");
    }

    // Verify the digger owns this bid
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from("digger_profiles")
      .select("id, user_id")
      .eq("id", diggerId)
      .single();

    if (profileError || !diggerProfile) {
      throw new Error("Digger profile not found");
    }

    if (diggerProfile.user_id !== user.id) {
      throw new Error("Unauthorized - not your profile");
    }

    const { data: bid, error: bidError } = await supabaseClient
      .from("bids")
      .select("id, digger_id, awarded")
      .eq("id", bidId)
      .single();

    if (bidError || !bid) {
      throw new Error("Bid not found");
    }

    if (bid.digger_id !== diggerId) {
      throw new Error("This bid does not belong to you");
    }

    if (!bid.awarded) {
      throw new Error("This bid has not been awarded");
    }

    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("id, status, consumer_id, awarded_bid_id, title")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error("Gig not found");
    }

    if (gig.status !== "awarded" || gig.awarded_bid_id !== bidId) {
      throw new Error("This gig is not in awarded state for this bid");
    }

    const now = new Date().toISOString();

    // Clear bid award
    await supabaseClient
      .from("bids")
      .update({
        awarded: false,
        awarded_at: null,
        awarded_by: null,
        award_declined_at: now,
        award_decline_reason: typeof reason === "string" ? reason.trim().slice(0, 500) : null,
        updated_at: now,
      })
      .eq("id", bidId);

    // Release gig award: back to open so Gigger can re-award or pick another bid
    await supabaseClient
      .from("gigs")
      .update({
        status: "open",
        awarded_bid_id: null,
        awarded_digger_id: null,
        awarded_at: null,
        updated_at: now,
      })
      .eq("id", gigId);

    // Notify Gigger
    if (gig.consumer_id) {
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: gig.consumer_id,
          type: "digger_declined_award",
          title: "Award declined",
          message: `The professional declined the award for "${gig.title}". You can award another bid or re-award later.`,
          link: `/gig/${gigId}`,
          metadata: {
            gig_id: gigId,
            bid_id: bidId,
            digger_id: diggerId,
            reason: typeof reason === "string" ? reason.trim().slice(0, 500) : null,
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Award declined. The client can award another bid.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
