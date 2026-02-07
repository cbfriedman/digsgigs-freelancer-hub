import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({})) as { conversation_id?: string; message_id?: string };
    const conversationId = body.conversation_id;
    const messageId = body.message_id;
    if (!conversationId || !messageId) {
      return new Response(JSON.stringify({ error: "conversation_id and message_id are required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: message, error: msgError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .single();

    if (msgError || !message) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (message.sender_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the sender can trigger this notification" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id, consumer_id, digger_id, admin_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let recipientUserId: string | null = null;
    if (conv.admin_id) {
      recipientUserId = message.sender_id === conv.admin_id ? conv.consumer_id : conv.admin_id;
    } else {
      if (message.sender_id === conv.consumer_id) {
        const { data: dp } = await supabase
          .from("digger_profiles")
          .select("user_id")
          .eq("id", conv.digger_id)
          .single();
        recipientUserId = dp?.user_id ?? null;
      } else {
        recipientUserId = conv.consumer_id;
      }
    }

    if (!recipientUserId || recipientUserId === user.id) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_recipient_or_self" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", recipientUserId)
      .single();

    if (!recipientProfile?.email?.trim()) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_email" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("message_notification_settings")
      .select("delay_minutes")
      .limit(1)
      .single();

    const delayMinutes = Math.max(0, Number(settings?.delay_minutes) ?? 0);
    const sendAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    await supabase.from("message_notification_queue").insert({
      conversation_id: conversationId,
      message_id: messageId,
      recipient_user_id: recipientUserId,
      send_after: sendAfter,
    });

    // When delay is 0, trigger the queue processor immediately so the email sends within seconds.
    if (delayMinutes === 0) {
      const functionsUrl = supabaseUrl.replace(/\/$/, "") + "/functions/v1/process-message-notification-queue";
      fetch(functionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + serviceKey,
        },
        body: "{}",
      }).catch((err) => console.error("enqueue: trigger process queue failed", err));
    }

    return new Response(JSON.stringify({ ok: true, enqueued: true, send_after: sendAfter }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enqueue-message-notification error:", e);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
