import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CONFIRM-DEPOSIT-SESSION] ${step}${detailsStr}`);
};

/**
 * Fallback when webhook didn't run: confirm a Stripe checkout session and mark
 * the Digger as hired (update deposit → paid, bid → awarded/accepted, gig → in_progress).
 * Idempotent: if deposit is already paid, no-op and return success.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { session_id: sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "session_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Fetching Stripe session", { sessionId });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: "Session not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (session.payment_status !== "paid") {
      logStep("Session not paid", { payment_status: session.payment_status });
      return new Response(
        JSON.stringify({ success: false, reason: "not_paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.metadata?.type !== "gigger_deposit") {
      logStep("Not a gigger deposit session", { type: session.metadata?.type });
      return new Response(
        JSON.stringify({ success: false, reason: "not_deposit" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const depositId = session.metadata.deposit_id as string;
    const gigId = session.metadata.gig_id as string;
    const bidId = session.metadata.bid_id as string;
    const diggerId = session.metadata.digger_id as string;
    const giggerId = session.metadata.gigger_id as string;

    if (!depositId || !gigId || !bidId || !diggerId || !giggerId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing metadata (deposit_id, gig_id, bid_id, digger_id, gigger_id)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: deposit, error: depositFetchError } = await supabaseClient
      .from("gigger_deposits")
      .select("id, status")
      .eq("id", depositId)
      .single();

    if (depositFetchError || !deposit) {
      logStep("Deposit not found", { depositId, error: depositFetchError?.message });
      return new Response(
        JSON.stringify({ success: false, error: "Deposit record not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (deposit.status === "paid") {
      logStep("Deposit already paid (idempotent)", { depositId });
      return new Response(
        JSON.stringify({ success: true, alreadyCompleted: true, digger_id: diggerId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Applying award from session", { depositId, gigId, bidId, diggerId });

    const { error: updateDepositError } = await supabaseClient
      .from("gigger_deposits")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq("id", depositId);

    if (updateDepositError) {
      logStep("Failed to update deposit", { error: updateDepositError.message });
      throw new Error(`Failed to update deposit: ${updateDepositError.message}`);
    }

    const awardedAt = new Date().toISOString();

    await supabaseClient
      .from("bids")
      .update({
        awarded: true,
        awarded_at: awardedAt,
        award_method: "consumer_hire",
        status: "pending",
      })
      .eq("id", bidId);

    await supabaseClient
      .from("gigs")
      .update({
        awarded_at: awardedAt,
        awarded_digger_id: diggerId,
        awarded_bid_id: bidId,
        status: "awarded",
      })
      .eq("id", gigId);

    const { data: diggerProfile } = await supabaseClient
      .from("digger_profiles")
      .select("user_id")
      .eq("id", diggerId)
      .single();

    const { data: gig } = await supabaseClient
      .from("gigs")
      .select("title")
      .eq("id", gigId)
      .single();

    const { data: depositRow } = await supabaseClient
      .from("gigger_deposits")
      .select("acceptance_deadline")
      .eq("id", depositId)
      .single();

    if (diggerProfile) {
      await supabaseClient.from("notifications").insert({
        user_id: diggerProfile.user_id,
        type: "lead_awarded_exclusive",
        title: "You're awarded",
        message: `You've been awarded "${gig?.title || "this gig"}". Accept within 24 hours or you'll be charged a $100 penalty (same if you decline). If you decline, the client gets their deposit back.`,
        link: `/gig/${gigId}`,
        metadata: {
          gig_id: gigId,
          bid_id: bidId,
          deposit_id: depositId,
          acceptance_deadline: depositRow?.acceptance_deadline,
        },
      });
    }

    // Insert award system message into chat (same as webhook / saved-card path) so the message shows in the message box
    try {
      const { data: bidRow } = await supabaseClient.from("bids").select("amount").eq("id", bidId).single();
      const amount = bidRow?.amount ?? null;
      let { data: conv } = await supabaseClient
        .from("conversations")
        .select("id")
        .eq("gig_id", gigId)
        .eq("digger_id", diggerId)
        .eq("consumer_id", giggerId)
        .is("admin_id", null)
        .maybeSingle();
      if (!conv?.id) {
        const { data: newConv } = await supabaseClient
          .from("conversations")
          .insert({ gig_id: gigId, digger_id: diggerId, consumer_id: giggerId })
          .select("id")
          .single();
        conv = newConv;
      }
      if (conv?.id) {
        await supabaseClient.from("messages").insert({
          conversation_id: conv.id,
          sender_id: giggerId,
          content: "You've been awarded this gig. Accept within 24 hours or you'll be charged a $100 penalty. If you decline, you'll be charged a $100 penalty.",
          metadata: { _type: "award_event", event: "awarded", bid_id: bidId, gig_id: gigId, amount },
        });
        logStep("Award system message inserted into chat");
      }
    } catch (chatErr) {
      logStep("Failed to insert award chat message (non-blocking)", { error: chatErr instanceof Error ? chatErr.message : String(chatErr) });
    }

    logStep("Award completed via confirm-deposit-session");

    return new Response(
      JSON.stringify({ success: true, digger_id: diggerId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
