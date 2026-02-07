import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const THROTTLE_HOURS = 4;
const BASE_URL = Deno.env.get("PUBLIC_APP_URL") || "https://digsandgigs.net";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
      .select("id, conversation_id, sender_id, content, created_at")
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
      .select("email, full_name")
      .eq("id", recipientUserId)
      .single();

    const recipientEmail = recipientProfile?.email?.trim();
    if (!recipientEmail) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_email" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const throttleSince = new Date(Date.now() - THROTTLE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: lastSent } = await supabase
      .from("message_notification_emails")
      .select("last_sent_at")
      .eq("conversation_id", conversationId)
      .eq("recipient_user_id", recipientUserId)
      .gte("last_sent_at", throttleSince)
      .maybeSingle();

    if (lastSent) {
      return new Response(JSON.stringify({ ok: true, skipped: "throttled" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: muted } = await supabase
      .from("conversation_mutes")
      .select("user_id")
      .eq("user_id", recipientUserId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (muted) {
      return new Response(JSON.stringify({ ok: true, skipped: "muted" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", message.sender_id)
      .single();

    const { data: senderDigger } = await supabase
      .from("digger_profiles")
      .select("business_name")
      .eq("user_id", message.sender_id)
      .maybeSingle();

    const senderName = (senderDigger?.business_name || senderProfile?.full_name || "Someone").trim() || "Someone";
    const snippet = (message.content || "").trim().slice(0, 200);
    const messageUrl = `${BASE_URL}/messages?conversation=${conversationId}`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set; skipping email");
      return new Response(JSON.stringify({ ok: true, skipped: "no_resend_key" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const subject = `New message from ${senderName} on Digs & Gigs`;
    await resend.emails.send({
      from: "Digs and Gigs <noreply@digsandgigs.net>",
      to: [recipientEmail],
      subject,
      html: `
        <p>You have a new message from <strong>${escapeHtml(senderName)}</strong> on Digs & Gigs.</p>
        ${snippet ? `<p style="margin: 16px 0; padding: 12px; background: #f1f5f9; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(snippet)}${snippet.length >= 200 ? "…" : ""}</p>` : ""}
        <p><a href="${escapeHtml(messageUrl)}" style="display: inline-block; background: #0d9488; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View message</a></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">You're receiving this because you have an account on Digs & Gigs. Reply in the app to continue the conversation.</p>
      `,
    }).catch((err) => console.error("send-message-notification-email Resend error:", err));

    await supabase
      .from("message_notification_emails")
      .upsert(
        {
          conversation_id: conversationId,
          recipient_user_id: recipientUserId,
          last_sent_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,recipient_user_id" }
      );

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-message-notification-email error:", e);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
