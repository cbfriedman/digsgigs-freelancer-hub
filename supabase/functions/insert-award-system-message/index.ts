import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[INSERT-AWARD-SYSTEM-MESSAGE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = (await req.json()) as {
      gigId: string;
      diggerId: string;
      consumerId: string;
      event: "awarded" | "accepted" | "declined" | "cancelled";
      bidId?: string;
      amount?: number;
    };

    const { gigId, diggerId, consumerId, event, bidId, amount } = body;

    if (!gigId || !diggerId || !consumerId || !event) {
      throw new Error("gigId, diggerId, consumerId, and event are required");
    }

    // Only gigger (consumer) can insert "awarded" or "cancelled"; digger inserts "accepted"/"declined" via their own functions
    if (event === "awarded" || event === "cancelled") {
      if (user.id !== consumerId) {
        throw new Error("Only the gig owner can insert this event");
      }
    }

    logStep("Inserting award system message", { gigId, diggerId, event });

    let { data: conv } = await supabaseClient
      .from("conversations")
      .select("id")
      .eq("gig_id", gigId)
      .eq("digger_id", diggerId)
      .eq("consumer_id", consumerId)
      .is("admin_id", null)
      .maybeSingle();

    if (!conv?.id) {
      const { data: newConv, error: createErr } = await supabaseClient
        .from("conversations")
        .insert({ gig_id: gigId, digger_id: diggerId, consumer_id: consumerId })
        .select("id")
        .single();

      if (createErr) {
        logStep("Failed to create conversation", { error: createErr.message });
        throw new Error(`Failed to create conversation: ${createErr.message}`);
      }
      conv = newConv;
    }

    const contentByEvent: Record<string, string> = {
      awarded: "You've been awarded this gig. Set up the payment contract when ready.",
      accepted: "The professional accepted the award. Ready to start!",
      declined: "The professional declined the award.",
      cancelled: "The client cancelled the award. The gig is open again.",
    };
    const content = contentByEvent[event] ?? `Event: ${event}`;

    // For "awarded" and "cancelled", sender is the consumer (gigger)
    const senderId = event === "awarded" || event === "cancelled" ? consumerId : (await supabaseClient
      .from("digger_profiles")
      .select("user_id")
      .eq("id", diggerId)
      .single()).data?.user_id;

    if (!senderId) {
      logStep("Could not determine sender", { event, diggerId });
      throw new Error("Could not determine message sender");
    }

    const { error: insertErr } = await supabaseClient.from("messages").insert({
      conversation_id: conv.id,
      sender_id: senderId,
      content,
      metadata: { _type: "award_event", event, bid_id: bidId ?? null, gig_id: gigId, amount: amount ?? null },
    });

    if (insertErr) {
      logStep("Failed to insert message", { error: insertErr.message });
      throw new Error(`Failed to insert message: ${insertErr.message}`);
    }

    logStep("Award system message inserted", { conversationId: conv.id, event });

    return new Response(
      JSON.stringify({ success: true, conversationId: conv.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
