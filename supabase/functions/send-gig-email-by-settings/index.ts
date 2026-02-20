import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as { gigId: string };
    const { gigId } = body;
    if (!gigId) {
      return new Response(
        JSON.stringify({ error: "gigId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: gig, error: gigError } = await supabase
      .from("gigs")
      .select("id, consumer_id, title, description, budget_min, budget_max, timeline, location, calculated_price_cents")
      .eq("id", gigId)
      .single();

    if (gigError || !gig) {
      return new Response(
        JSON.stringify({ error: "Gig not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (gig.consumer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Only the project poster can trigger delivery" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settingsId = "b0000000-0000-0000-0000-000000000001";
    const { data: settings, error: settingsError } = await supabase
      .from("gig_email_delivery_settings")
      .select("mode, selected_digger_ids")
      .eq("id", settingsId)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ success: true, mode: "manual", emailsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (settings.mode === "manual") {
      return new Response(
        JSON.stringify({ success: true, mode: "manual", emailsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = Deno.env.get("SITE_URL") || "https://digsandgigs.net";
    const unlockUrl = `${baseUrl}/lead/${gigId}/unlock`;
    const gigViewUrl = `${baseUrl}/gig/${gigId}`;
    const priceDollars = gig.calculated_price_cents
      ? (gig.calculated_price_cents / 100).toFixed(0)
      : "9";
    const shortDescription = (gig.description?.substring(0, 200) || "") + (gig.description?.length > 200 ? "..." : "");
    const budgetRange = gig.budget_min && gig.budget_max
      ? `$${gig.budget_min.toLocaleString()} - $${gig.budget_max.toLocaleString()}`
      : "Not specified";

    const buildHtml = (
      recipientName: string,
      viewAndBidUrl: string,
      unlockLeadUrl: string,
      footerUnsubscribeUrl: string
    ) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New lead</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 560px; margin: 0 auto; padding: 24px;">
  <div>
    <p style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">Hi ${recipientName},</p>
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #4b5563;">A new project was posted on Digs &amp; Gigs. Details below.</p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin: 16px 0; border: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${gig.title}</p>
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${shortDescription}</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #6b7280;">
        <tr><td style="padding: 2px 0;"><strong style="color: #374151;">Budget</strong></td><td>${budgetRange}</td></tr>
        <tr><td style="padding: 2px 0;"><strong style="color: #374151;">Timeline</strong></td><td>${gig.timeline || "Flexible"}</td></tr>
        <tr><td style="padding: 2px 0;"><strong style="color: #374151;">Location</strong></td><td>${gig.location || "Not specified"}</td></tr>
      </table>
    </div>
    <p style="margin: 0 0 12px 0; font-size: 14px;">View and bid (free), or unlock the lead for $${priceDollars}.</p>
    <p style="margin: 0 0 8px 0;"><a href="${viewAndBidUrl}" style="color: #4f46e5; font-weight: 600;">View project &amp; bid</a></p>
    <p style="margin: 0 0 20px 0;"><a href="${unlockLeadUrl}" style="color: #4f46e5; font-weight: 600;">Unlock lead ($${priceDollars})</a></p>
    <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af;">Digs &amp; Gigs. <a href="${footerUnsubscribeUrl}" style="color: #6b7280;">Unsubscribe from lead emails</a>.</p>
  </div>
</body>
</html>`;

    const recipients: { id: string; user_id: string; email: string; full_name: string | null; business_name: string }[] = [];

    if (settings.mode === "selected" && Array.isArray(settings.selected_digger_ids) && settings.selected_digger_ids.length > 0) {
      const { data: diggers, error: dErr } = await supabase
        .from("digger_profiles")
        .select("id, user_id, business_name, profiles!inner(email, full_name)")
        .in("id", settings.selected_digger_ids);
      if (!dErr && diggers) {
        for (const d of diggers) {
          const profile = (d as any).profiles;
          if (profile?.email) {
            recipients.push({
              id: d.id,
              user_id: d.user_id,
              email: profile.email,
              full_name: profile.full_name ?? null,
              business_name: d.business_name ?? "",
            });
          }
        }
      }
    } else if (settings.mode === "all") {
      const { data: diggers, error: dErr } = await supabase
        .from("digger_profiles")
        .select("id, user_id, business_name, profiles!inner(email, full_name)");
      if (dErr) {
        return new Response(
          JSON.stringify({ error: dErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const userIds = (diggers || []).map((x: any) => x.user_id);
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("user_id, lead_notifications_enabled, enabled")
        .in("user_id", userIds);
      const prefsMap = new Map(
        (prefs || []).map((p: any) => [p.user_id, p.lead_notifications_enabled !== false && p.enabled !== false])
      );
      for (const d of diggers || []) {
        if (prefsMap.get(d.user_id) === false) continue;
        const profile = (d as any).profiles;
        if (profile?.email) {
          recipients.push({
            id: d.id,
            user_id: d.user_id,
            email: profile.email,
            full_name: profile.full_name ?? null,
            business_name: d.business_name ?? "",
          });
        }
      }
    }

    // Only send to diggers who have not already received an email for this gig (one email per digger per project)
    const { data: existingDeliveries } = await supabase
      .from("gig_digger_email_deliveries")
      .select("digger_id")
      .eq("gig_id", gigId);
    const alreadySentDiggerIds = new Set((existingDeliveries || []).map((r: { digger_id: string }) => r.digger_id));
    const recipientsToSend = recipients.filter((r) => !alreadySentDiggerIds.has(r.id));

    const gigAppLink = `/gig/${gigId}`;
    const titleSnippet = (gig.title || "").substring(0, 60) + ((gig.title?.length || 0) > 60 ? "…" : "");

    // In-app notification: send to ALL diggers who have lead notifications enabled (so every digger sees the alert)
    const { data: allDiggers, error: allDiggersErr } = await supabase
      .from("digger_profiles")
      .select("id, user_id");
    if (!allDiggersErr && allDiggers?.length) {
      const allUserIds = allDiggers.map((x: { user_id: string }) => x.user_id);
      const { data: appPrefs } = await supabase
        .from("email_preferences")
        .select("user_id, lead_notifications_enabled, enabled")
        .in("user_id", allUserIds);
      const appPrefsMap = new Map(
        (appPrefs || []).map((p: any) => [p.user_id, p.lead_notifications_enabled !== false && p.enabled !== false])
      );
      for (const d of allDiggers) {
        if (appPrefsMap.get(d.user_id) === false) continue;
        try {
          await supabase.rpc("create_notification", {
            p_user_id: d.user_id,
            p_type: "new_gig",
            p_title: "New project posted",
            p_message: `A new project is live: "${titleSnippet}"`,
            p_link: gigAppLink,
            p_metadata: { gig_id: gigId },
          });
        } catch (notifErr: unknown) {
          console.warn("[send-gig-email-by-settings] In-app notification failed for", d.user_id, notifErr);
        }
      }
    }

    // Email: send only to recipients per admin settings (all / selected / manual)

    const resend = new Resend(resendApiKey);
    const subject = (gig.title?.length || 0) > 45 ? `New lead: ${gig.title.substring(0, 45)}…` : `New lead: ${gig.title}`;
    let emailsSent = 0;
    const errors: string[] = [];

    for (const rec of recipientsToSend) {
      const name = rec.full_name || rec.business_name || "there";
      const footerUnsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(rec.email)}&type=leads`;
      try {
        await resend.emails.send({
          from: "Digs & Gigs <leads@digsandgigs.net>",
          to: [rec.email],
          subject,
          html: buildHtml(name, gigViewUrl, unlockUrl, footerUnsubscribeUrl),
        });
        emailsSent++;
        await supabase.from("gig_digger_email_deliveries").upsert(
          { gig_id: gigId, digger_id: rec.id, sent_at: new Date().toISOString(), sent_by: "auto" },
          { onConflict: "gig_id,digger_id" }
        );
      } catch (e: any) {
        errors.push(`${rec.email}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: settings.mode,
        emailsSent,
        totalRecipients: recipientsToSend.length,
        skippedAlreadySent: recipients.length - recipientsToSend.length,
        errors: errors.length ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-gig-email-by-settings]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
