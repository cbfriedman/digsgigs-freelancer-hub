import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

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

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: settings } = await supabase
      .from("message_notification_settings")
      .select("throttle_minutes")
      .limit(1)
      .single();

    const throttleMinutes = Math.max(0, Number(settings?.throttle_minutes) ?? 30);
    const throttleSince = new Date(Date.now() - throttleMinutes * 60 * 1000).toISOString();

    const { data: queueItems, error: queueError } = await supabase
      .from("message_notification_queue")
      .select("id, conversation_id, message_id, recipient_user_id")
      .is("sent_at", null)
      .lte("send_after", new Date().toISOString())
      .order("send_after", { ascending: true })
      .limit(50);

    if (queueError || !queueItems?.length) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, message: queueItems?.length === 0 ? "No items to process" : "Queue error" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    let sent = 0;
    let skipped = 0;

    for (const item of queueItems) {
      const { data: lastSent } = await supabase
        .from("message_notification_emails")
        .select("last_sent_at")
        .eq("conversation_id", item.conversation_id)
        .eq("recipient_user_id", item.recipient_user_id)
        .gte("last_sent_at", throttleSince)
        .maybeSingle();

      if (lastSent) {
        await supabase
          .from("message_notification_queue")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", item.id);
        skipped++;
        continue;
      }

      const { data: muted } = await supabase
        .from("conversation_mutes")
        .select("user_id")
        .eq("user_id", item.recipient_user_id)
        .eq("conversation_id", item.conversation_id)
        .maybeSingle();

      if (muted) {
        await supabase
          .from("message_notification_queue")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", item.id);
        skipped++;
        continue;
      }

      const { data: message } = await supabase
        .from("messages")
        .select("id, sender_id, content")
        .eq("id", item.message_id)
        .eq("conversation_id", item.conversation_id)
        .single();

      if (!message) {
        await supabase.from("message_notification_queue").update({ sent_at: new Date().toISOString() }).eq("id", item.id);
        continue;
      }

      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", item.recipient_user_id)
        .single();

      const recipientEmail = recipientProfile?.email?.trim();
      if (!recipientEmail) {
        await supabase.from("message_notification_queue").update({ sent_at: new Date().toISOString() }).eq("id", item.id);
        continue;
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
      const messageUrl = `${BASE_URL}/messages?conversation=${item.conversation_id}`;

      if (resend) {
        await resend.emails.send({
          from: "Digs and Gigs <noreply@digsandgigs.net>",
          to: [recipientEmail],
          subject: `New message from ${senderName} on Digs & Gigs`,
          html: `
            <p>You have a new message from <strong>${escapeHtml(senderName)}</strong> on Digs & Gigs.</p>
            ${snippet ? `<p style="margin: 16px 0; padding: 12px; background: #f1f5f9; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(snippet)}${snippet.length >= 200 ? "…" : ""}</p>` : ""}
            <p><a href="${escapeHtml(messageUrl)}" style="display: inline-block; background: #0d9488; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View message</a></p>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">You're receiving this because you have an account on Digs & Gigs. Reply in the app to continue the conversation.</p>
          `,
        }).catch((err) => console.error("process-message-notification-queue Resend error:", err));
      }

      await supabase.from("message_notification_emails").upsert(
        {
          conversation_id: item.conversation_id,
          recipient_user_id: item.recipient_user_id,
          last_sent_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,recipient_user_id" }
      );

      await supabase
        .from("message_notification_queue")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", item.id);

      sent++;
    }

    return new Response(
      JSON.stringify({ ok: true, processed: queueItems.length, sent, skipped }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-message-notification-queue error:", e);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
