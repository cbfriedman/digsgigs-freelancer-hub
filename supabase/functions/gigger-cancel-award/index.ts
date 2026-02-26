import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[GIGGER-CANCEL-AWARD] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
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

    const { gigId } = await req.json();

    if (!gigId) {
      throw new Error("gigId is required");
    }

    const { data: gig, error: gigError } = await supabaseClient
      .from("gigs")
      .select("id, status, consumer_id, awarded_bid_id, awarded_digger_id, title")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      throw new Error("Gig not found");
    }

    if (gig.consumer_id !== user.id) {
      throw new Error("Only the gig owner can cancel the award");
    }

    if (gig.status !== "awarded") {
      throw new Error("Only awarded gigs can be cancelled. Current status: " + (gig.status || "unknown"));
    }

    const bidId = gig.awarded_bid_id;
    const diggerId = gig.awarded_digger_id;
    if (!bidId || !diggerId) {
      throw new Error("Gig has no awarded bid");
    }

    const now = new Date().toISOString();
    let refunded = false;

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

      const { data: deposit } = await supabaseClient
        .from("gigger_deposits")
        .select("id, status, stripe_payment_intent_id, deposit_amount_cents")
        .eq("bid_id", bidId)
        .eq("status", "paid")
        .is("refunded_at", null)
        .maybeSingle();

      if (deposit?.stripe_payment_intent_id) {
        try {
          await stripe.refunds.create({
            payment_intent: deposit.stripe_payment_intent_id,
            reason: "requested_by_customer",
          });
          logStep("Gigger deposit refunded", { depositId: deposit.id });

          await supabaseClient
            .from("gigger_deposits")
            .update({
              status: "refunded",
              refunded_at: now,
              refund_reason: "gigger_cancelled_award",
            })
            .eq("id", deposit.id);

          refunded = true;
        } catch (refundErr) {
          logStep("Refund failed", { error: refundErr instanceof Error ? refundErr.message : String(refundErr) });
          throw new Error("Failed to refund deposit. Please contact support.");
        }
      }
    }

    await supabaseClient
      .from("bids")
      .update({
        awarded: false,
        awarded_at: null,
        awarded_by: null,
        updated_at: now,
      })
      .eq("id", bidId);

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

    const { data: diggerProfile } = await supabaseClient
      .from("digger_profiles")
      .select("user_id")
      .eq("id", diggerId)
      .single();

    if (diggerProfile?.user_id) {
      await supabaseClient
        .from("notifications")
        .insert({
          user_id: diggerProfile.user_id,
          type: "gigger_cancelled_award",
          title: "Award cancelled",
          message: `The client cancelled the award for "${gig.title}". The gig is open again for proposals.`,
          link: `/gig/${gigId}`,
          metadata: { gig_id: gigId, bid_id: bidId, refunded },
        });
    }

    // Insert "cancelled" system message into chat
    try {
      const { data: bid } = await supabaseClient.from("bids").select("amount").eq("id", bidId).single();
      const bidAmount = bid?.amount ?? null;
      let { data: conv } = await supabaseClient
        .from("conversations")
        .select("id")
        .eq("gig_id", gigId)
        .eq("digger_id", diggerId)
        .eq("consumer_id", gig.consumer_id)
        .is("admin_id", null)
        .maybeSingle();
      if (!conv?.id) {
        const { data: newConv } = await supabaseClient
          .from("conversations")
          .insert({ gig_id: gigId, digger_id: diggerId, consumer_id: gig.consumer_id })
          .select("id")
          .single();
        conv = newConv;
      }
      if (conv?.id) {
        await supabaseClient.from("messages").insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: "The client cancelled the award. The gig is open again.",
          metadata: { _type: "award_event", event: "cancelled", bid_id: bidId, gig_id: gigId, amount: bidAmount },
        });
        logStep("Award cancelled system message inserted into chat");
      }
    } catch (chatErr) {
      logStep("Failed to insert cancelled chat message (non-blocking)", { error: chatErr instanceof Error ? chatErr.message : String(chatErr) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: refunded ? "Award cancelled. Your deposit has been refunded." : "Award cancelled. The gig is open again.",
        refunded: !!refunded,
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
