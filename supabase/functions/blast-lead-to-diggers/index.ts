import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadBlastRequest {
  leadId: string;
  proOnly?: boolean; // If true, only send to Pro diggers (immediate). If false/undefined, send to non-Pro (delayed).
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const resend = new Resend(resendApiKey);

  try {
    const { leadId, proOnly = true }: LeadBlastRequest = await req.json();

    if (!leadId) {
      throw new Error("leadId is required");
    }

    const blastType = proOnly ? "PRO" : "NON-PRO";
    console.log(`[blast-lead-to-diggers] Processing ${blastType} blast for lead: ${leadId}`);

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from("gigs")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadError?.message}`);
    }

    // Check if this blast type was already sent
    if (proOnly && lead.pro_blast_sent_at) {
      console.log(`[blast-lead-to-diggers] Pro blast already sent for lead ${leadId}`);
      return new Response(
        JSON.stringify({ success: true, message: "Pro blast already sent", emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!proOnly && lead.non_pro_blast_sent_at) {
      console.log(`[blast-lead-to-diggers] Non-Pro blast already sent for lead ${leadId}`);
      return new Response(
        JSON.stringify({ success: true, message: "Non-Pro blast already sent", emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate price in dollars
    const priceDollars = lead.calculated_price_cents 
      ? (lead.calculated_price_cents / 100).toFixed(0)
      : "9"; // Default minimum

    console.log(`[blast-lead-to-diggers] Lead price: $${priceDollars}`);

    // Get all Diggers with their emails and subscription status
    const { data: diggers, error: diggersError } = await supabase
      .from("digger_profiles")
      .select(`
        id,
        user_id,
        business_name,
        subscription_tier,
        subscription_status,
        profiles!inner(email, full_name)
      `);

    if (diggersError) {
      throw new Error(`Error fetching diggers: ${diggersError.message}`);
    }

    // Filter diggers based on Pro status
    const isPro = (d: any) => 
      d.subscription_tier === 'pro' && d.subscription_status === 'active';
    
    const targetDiggers = proOnly 
      ? (diggers || []).filter(isPro)
      : (diggers || []).filter(d => !isPro(d));

    console.log(`[blast-lead-to-diggers] Found ${targetDiggers.length} ${blastType} diggers`);

    // For non-Pro blast, also include subscribers
    let subscribers: any[] = [];
    if (!proOnly) {
      const { data: subs, error: subscribersError } = await supabase
        .from("subscribers")
        .select("id, email, full_name")
        .eq("unsubscribed", false);

      if (subscribersError) {
        console.error(`[blast-lead-to-diggers] Error fetching subscribers: ${subscribersError.message}`);
      } else {
        subscribers = subs || [];
      }
      console.log(`[blast-lead-to-diggers] Found ${subscribers.length} subscribers`);
    }

    if (targetDiggers.length === 0 && subscribers.length === 0) {
      // Still update the timestamp to mark as processed
      const updateField = proOnly ? { pro_blast_sent_at: new Date().toISOString() } : { non_pro_blast_sent_at: new Date().toISOString() };
      await supabase.from("gigs").update(updateField).eq("id", leadId);
      
      return new Response(
        JSON.stringify({ success: true, message: `No ${blastType} recipients to notify`, emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check email preferences for each digger
    const diggerUserIds = targetDiggers.map(d => d.user_id);
    const { data: emailPrefs } = await supabase
      .from("email_preferences")
      .select("user_id, lead_notifications_enabled, enabled")
      .in("user_id", diggerUserIds);

    // Create a map of user_id to notification preference
    const prefsMap = new Map(
      (emailPrefs || []).map(p => [p.user_id, p.lead_notifications_enabled !== false && p.enabled !== false])
    );

    // Filter diggers who want lead notifications (default to true if no preference)
    const eligibleDiggers = targetDiggers.filter(d => prefsMap.get(d.user_id) !== false);

    // Only email diggers who have not already received an email for this gig (one email per digger per project)
    const { data: existingDeliveries } = await supabase
      .from("gig_digger_email_deliveries")
      .select("digger_id")
      .eq("gig_id", leadId);
    const alreadySentDiggerIds = new Set((existingDeliveries || []).map((r: { digger_id: string }) => r.digger_id));
    const diggersToEmail = eligibleDiggers.filter((d: { id: string }) => !alreadySentDiggerIds.has(d.id));

    console.log(`[blast-lead-to-diggers] Eligible ${blastType} diggers after filtering: ${eligibleDiggers.length}, already sent: ${alreadySentDiggerIds.size}, will email: ${diggersToEmail.length}`);

    // Prepare email content
    const baseUrl = Deno.env.get("SITE_URL") || "https://digsandgigs.net";
    const unlockUrl = `${baseUrl}/lead/${leadId}/unlock`;
    const gigAppLink = `/gig/${leadId}`;

    // Create in-app notifications for diggers we will email (avoid duplicate notification if they already got email from send-gig-email-by-settings)
    for (const digger of diggersToEmail) {
      try {
        await supabase.rpc("create_notification", {
          p_user_id: digger.user_id,
          p_type: "new_gig",
          p_title: proOnly ? "New project (early access)" : "New project posted",
          p_message: `A new project is live: "${(lead.title || "").substring(0, 60)}${(lead.title?.length || 0) > 60 ? "…" : ""}"`,
          p_link: gigAppLink,
          p_metadata: { gig_id: leadId },
        });
      } catch (notifErr: unknown) {
        console.warn(`[blast-lead-to-diggers] In-app notification failed for digger ${digger.user_id}:`, notifErr);
      }
    }
    console.log(`[blast-lead-to-diggers] Created ${diggersToEmail.length} in-app notifications for ${blastType} diggers`);

    const shortDescription = lead.description?.substring(0, 200) + (lead.description?.length > 200 ? "..." : "") || "";
    const budgetRange = lead.budget_min && lead.budget_max 
      ? `$${lead.budget_min.toLocaleString()} - $${lead.budget_max.toLocaleString()}`
      : "Not specified";
    const gigViewUrl = `${baseUrl}/gig/${leadId}`;

    // Transactional-style email so it’s more likely to land in Primary, not Promotions:
    // no emoji in subject, minimal marketing styling, notification tone, single clear CTA.
    const buildDiggerEmailHtml = (recipientName: string, viewAndBidUrl: string, unlockLeadUrl: string, footerUnsubscribeUrl: string, options?: { earlyAccessLine?: boolean; showProTip?: boolean }) => {
      const earlyAccessLine = options?.earlyAccessLine
        ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">You're seeing this project before other diggers (early access).</p>`
        : "";
      const proTip = options?.showProTip
        ? `<p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">Pro diggers get new projects earlier. <a href="${baseUrl}/pricing" style="color: #4f46e5;">Pricing</a></p>`
        : "";
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New lead: ${lead.title?.substring(0, 50) || "Project"}...</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 560px; margin: 0 auto; padding: 24px; background: #fff;">
  <div style="padding: 0 0 20px 0;">
    <p style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">Hi ${recipientName},</p>
    <p style="margin: 0 0 12px 0; font-size: 15px; color: #4b5563;">A new project was posted on Digs &amp; Gigs. Details below.</p>
    ${earlyAccessLine}
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
    ${proTip}
    <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af;">Digs &amp; Gigs. <a href="${footerUnsubscribeUrl}" style="color: #6b7280;">Unsubscribe from lead emails</a>.</p>
  </div>
</body>
</html>`;
    };

    let emailsSent = 0;
    const errors: string[] = [];

    // Send emails only to diggers who have not already received for this gig
    for (const digger of diggersToEmail) {
      const profile = (digger as any).profiles;
      const email = profile?.email;
      const name = profile?.full_name || digger.business_name || "there";

      if (!email) {
        console.warn(`[blast-lead-to-diggers] No email for digger ${digger.id}`);
        continue;
      }

      const footerUnsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&type=leads`;

      try {
        const subject = (lead.title?.length || 0) > 45
          ? `New lead: ${(lead.title as string).substring(0, 45)}…`
          : `New lead: ${lead.title}`;
        await resend.emails.send({
          from: "Digs & Gigs <leads@digsandgigs.net>",
          to: [email],
          subject: proOnly ? `[Early access] ${subject}` : subject,
          html: buildDiggerEmailHtml(name, gigViewUrl, unlockUrl, footerUnsubscribeUrl, { earlyAccessLine: proOnly, showProTip: !proOnly }),
        });

        emailsSent++;
        console.log(`[blast-lead-to-diggers] Email sent to ${email}`);
        // Record delivery for admin dashboard visibility
        await supabase.from("gig_digger_email_deliveries").upsert(
          { gig_id: leadId, digger_id: digger.id, sent_at: new Date().toISOString(), sent_by: "auto" },
          { onConflict: "gig_id,digger_id" }
        ).then(({ error: recErr }) => {
          if (recErr) console.warn(`[blast-lead-to-diggers] Record delivery failed for ${digger.id}:`, recErr);
        });
      } catch (emailError: any) {
        console.error(`[blast-lead-to-diggers] Failed to send to ${email}:`, emailError);
        errors.push(`${email}: ${emailError.message}`);
      }
    }

    // Send to subscribers (only for non-Pro blast)
    if (!proOnly) {
      for (const subscriber of subscribers) {
        const email = subscriber.email;
        const name = subscriber.full_name || "there";

        if (!email) continue;

        // Skip if we already sent to this email (might be both a digger and subscriber)
        const alreadySent = diggersToEmail.some((d: any) => d.profiles?.email?.toLowerCase() === email.toLowerCase());
        if (alreadySent) continue;

        try {
          const subscriberUnlockUrl = `${baseUrl}/lead/${leadId}/unlock?sub=${subscriber.id}`;
          const footerUnsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&type=leads`;

          const subj = (lead.title?.length || 0) > 45
            ? `New lead: ${(lead.title as string).substring(0, 45)}…`
            : `New lead: ${lead.title}`;
          await resend.emails.send({
            from: "Digs & Gigs <leads@digsandgigs.net>",
            to: [email],
            subject: subj,
            html: buildDiggerEmailHtml(name, gigViewUrl, subscriberUnlockUrl, footerUnsubscribeUrl, { showProTip: true }),
          });

          emailsSent++;
          console.log(`[blast-lead-to-diggers] Email sent to subscriber ${email}`);
        } catch (emailError: any) {
          console.error(`[blast-lead-to-diggers] Failed to send to subscriber ${email}:`, emailError);
          errors.push(`${email}: ${emailError.message}`);
        }
      }
    }

    // Update the blast timestamp
    const updateField = proOnly 
      ? { pro_blast_sent_at: new Date().toISOString() } 
      : { non_pro_blast_sent_at: new Date().toISOString() };
    
    await supabase.from("gigs").update(updateField).eq("id", leadId);

    console.log(`[blast-lead-to-diggers] ${blastType} blast complete. Sent ${emailsSent} emails, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        blastType,
        emailsSent,
        totalDiggers: diggersToEmail.length,
        totalSubscribers: subscribers.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[blast-lead-to-diggers] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
