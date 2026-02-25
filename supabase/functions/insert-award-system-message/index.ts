import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

type AwardEvent = "awarded" | "accepted" | "declined";

interface InsertPayload {
  gigId: string;
  diggerId: string;
  consumerId: string;
  event: AwardEvent;
  bidId?: string;
  amount?: number;
  /** For accepted/declined: digger's user_id (sender) */
  actorUserId?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as InsertPayload;
    const { gigId, diggerId, consumerId, event, bidId, amount, actorUserId } = body;

    if (!gigId || !diggerId || !consumerId || !event) {
      return new Response(
        JSON.stringify({ error: "gigId, diggerId, consumerId, event required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["awarded", "accepted", "declined"].includes(event)) {
      return new Response(
        JSON.stringify({ error: "event must be awarded, accepted, or declined" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create conversation
    let { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("gig_id", gigId)
      .eq("digger_id", diggerId)
      .eq("consumer_id", consumerId)
      .is("admin_id", null)
      .maybeSingle();

    if (convError) {
      console.error("insert-award-system-message conv error:", convError);
      return new Response(
        JSON.stringify({ error: convError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!conv?.id) {
      const { data: newConv, error: insertConvError } = await supabase
        .from("conversations")
        .insert({
          gig_id: gigId,
          digger_id: diggerId,
          consumer_id: consumerId,
        })
        .select("id")
        .single();

      if (insertConvError) {
        console.error("insert-award-system-message create conv error:", insertConvError);
        return new Response(
          JSON.stringify({ error: insertConvError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      conv = newConv;
    }

    const senderId = event === "awarded" ? consumerId : (actorUserId ?? consumerId);
    const content = event === "awarded"
      ? "You've been awarded this gig. Accept within 24 hours or you'll be charged a $100 penalty. If you decline, you'll be charged a $100 penalty."
      : event === "accepted"
        ? "Accepted the award. Ready to start!"
        : "Declined the award.";

    const metadata = {
      _type: "award_event",
      event,
      bid_id: bidId ?? null,
      gig_id: gigId,
      amount: amount ?? null,
    };

    const { data: msg, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: senderId,
        content,
        metadata,
      })
      .select("id")
      .single();

    if (msgError) {
      console.error("insert-award-system-message insert error:", msgError);
      return new Response(
        JSON.stringify({ error: msgError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: msg.id, conversationId: conv.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("insert-award-system-message error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
