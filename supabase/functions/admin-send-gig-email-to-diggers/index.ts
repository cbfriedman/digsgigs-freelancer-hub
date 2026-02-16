import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminSendGigEmailRequest {
  gigId: string;
  diggerIds?: string[]; // digger_profiles.id; if empty/omitted = send to all eligible diggers
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRoles } = await supabase
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", user.id)
      .eq("app_role", "admin")
      .eq("is_active", true);

    if (!adminRoles?.length) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as AdminSendGigEmailRequest;
    const { gigId, diggerIds } = body;

    if (!gigId) {
      return new Response(
        JSON.stringify({ error: "gigId is required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const { data: lead, error: leadError } = await supabase
      .from("gigs")
      .select("*")
      .eq("id", gigId)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Gig not found" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = Deno.env.get("SITE_URL") || "https://digsandgigs.net";
    const unlockUrl = `${baseUrl}/lead/${gigId}/unlock`;
    const gigViewUrl = `${baseUrl}/gig/${gigId}`;
    const priceDollars = lead.calculated_price_cents
      ? (lead.calculated_price_cents / 100).toFixed(0)
      : "9";
    const shortDescription = (lead.description?.substring(0, 200) || "") + (lead.description?.length > 200 ? "..." : "");
    const budgetRange = lead.budget_min && lead.budget_max
      ? `$${lead.budget_min.toLocaleString()} - $${lead.budget_max.toLocaleString()}`
      : "Not specified";

    const buildDiggerEmailHtml = (
      recipientName: string,
      viewAndBidUrl: string,
      unlockLeadUrl: string,
      footerUnsubscribeUrl: string
    ) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New lead: ${(lead.title || "").substring(0, 50)}...</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 560px; margin: 0 auto; padding: 24px; background: #fff;">
  <div style="padding: 0 0 20px 0;">
    <p style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">Hi ${recipientName},</p>
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #4b5563;">A new project was posted on Digs &amp; Gigs. Details below.</p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin: 16px 0; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${lead.title}</p>
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${shortDescription}</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #6b7280;">
        <tr><td style="padding: 2px 0;"><strong style="color: #374151;">Budget</strong></td><td style="padding: 2px 0;">${budgetRange}</td></tr>
        <tr><td style="padding: 2px 0;"><strong style="color: #374151;">Timeline</strong></td><td style="padding: 2px 0;">${lead.timeline || "Flexible"}</td></tr>
        <tr><td style="padding: 2px 0;"><strong style="color: #374151;">Location</strong></td><td style="padding: 2px 0;">${lead.location || "Not specified"}</td></tr>
      </table>
    </div>
    <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">View and bid (free), or unlock the lead for $${priceDollars} to get the client's contact details.</p>
    <p style="margin: 0 0 8px 0;">
      <a href="${viewAndBidUrl}" style="color: #4f46e5; font-weight: 600; text-decoration: none;">View project &amp; bid</a>
    </p>
    <p style="margin: 0 0 20px 0;">
      <a href="${unlockLeadUrl}" style="color: #4f46e5; font-weight: 600; text-decoration: none;">Unlock lead ($${priceDollars})</a>
    </p>
    <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af;">Digs &amp; Gigs. <a href="${footerUnsubscribeUrl}" style="color: #6b7280;">Unsubscribe from lead emails</a>.</p>
  </div>
</body>
</html>`;

    const recipients: { id: string; user_id: string; business_name: string; email: string; full_name: string | null }[] = [];

    if (diggerIds && diggerIds.length > 0) {
      const { data: diggers, error: diggersErr } = await supabase
        .from("digger_profiles")
        .select("id, user_id, business_name, profiles!inner(email, full_name)")
        .in("id", diggerIds);

      if (diggersErr) {
        return new Response(
          JSON.stringify({ error: diggersErr.message }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      for (const d of diggers || []) {
        const profile = (d as any).profiles;
        const email = profile?.email;
        if (email) {
          recipients.push({
            id: d.id,
            user_id: d.user_id,
            business_name: d.business_name,
            email,
            full_name: profile?.full_name ?? null,
          });
        }
      }
    } else {
      const { data: diggers, error: diggersErr } = await supabase
        .from("digger_profiles")
        .select("id, user_id, business_name, profiles!inner(email, full_name)");

      if (diggersErr) {
        return new Response(
          JSON.stringify({ error: diggersErr.message }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const diggerUserIds = (diggers || []).map((d: any) => d.user_id);
      const { data: emailPrefs } = await supabase
        .from("email_preferences")
        .select("user_id, lead_notifications_enabled, enabled")
        .in("user_id", diggerUserIds);

      const prefsMap = new Map(
        (emailPrefs || []).map((p: any) => [p.user_id, p.lead_notifications_enabled !== false && p.enabled !== false])
      );

      for (const d of diggers || []) {
        if (prefsMap.get(d.user_id) === false) continue;
        const profile = (d as any).profiles;
        const email = profile?.email;
        if (email) {
          recipients.push({
            id: d.id,
            user_id: d.user_id,
            business_name: d.business_name,
            email,
            full_name: profile?.full_name ?? null,
          });
        }
      }
    }

    const resend = new Resend(resendApiKey);
    const subject = (lead.title?.length || 0) > 45
      ? `New lead: ${(lead.title as string).substring(0, 45)}…`
      : `New lead: ${lead.title}`;

    let emailsSent = 0;
    const errors: string[] = [];

    for (const rec of recipients) {
      const name = rec.full_name || rec.business_name || "there";
      const footerUnsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(rec.email)}&type=leads`;

      try {
        await resend.emails.send({
          from: "Digs & Gigs <leads@digsandgigs.net>",
          to: [rec.email],
          subject,
          html: buildDiggerEmailHtml(name, gigViewUrl, unlockUrl, footerUnsubscribeUrl),
        });
        emailsSent++;

        await supabase.from("gig_digger_email_deliveries").upsert(
          { gig_id: gigId, digger_id: rec.id, sent_at: new Date().toISOString(), sent_by: "admin" },
          { onConflict: "gig_id,digger_id" }
        );
      } catch (emailError: any) {
        console.error(`[admin-send-gig-email] Failed to send to ${rec.email}:`, emailError);
        errors.push(`${rec.email}: ${emailError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        totalRecipients: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[admin-send-gig-email-to-diggers] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
