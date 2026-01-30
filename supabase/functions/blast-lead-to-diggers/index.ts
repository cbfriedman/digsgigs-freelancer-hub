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

    console.log(`[blast-lead-to-diggers] Eligible ${blastType} diggers after filtering: ${eligibleDiggers.length}`);

    // Prepare email content
    const baseUrl = Deno.env.get("SITE_URL") || "https://digsandgigs.net";
    const unlockUrl = `${baseUrl}/lead/${leadId}/unlock`;

    const shortDescription = lead.description?.substring(0, 200) + (lead.description?.length > 200 ? "..." : "") || "";
    const budgetRange = lead.budget_min && lead.budget_max 
      ? `$${lead.budget_min.toLocaleString()} - $${lead.budget_max.toLocaleString()}`
      : "Not specified";

    // Add urgency messaging for Pro vs Non-Pro
    const proExclusiveBanner = proOnly 
      ? `<div style="background: linear-gradient(135deg, #5b21b6, #7c3aed); color: white; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <strong>⚡ Pro Digger Early Access</strong> — You're seeing this 2 hours before other diggers!
        </div>`
      : '';

    let emailsSent = 0;
    const errors: string[] = [];

    // Send emails to each eligible digger
    for (const digger of eligibleDiggers) {
      const profile = (digger as any).profiles;
      const email = profile?.email;
      const name = profile?.full_name || digger.business_name || "Digger";

      if (!email) {
        console.warn(`[blast-lead-to-diggers] No email for digger ${digger.id}`);
        continue;
      }

      try {
        await resend.emails.send({
          from: "Digs & Gigs <leads@digsandgigs.net>",
          to: [email],
          subject: proOnly ? `⚡ Early Access: ${lead.title}` : `🎯 New Lead: ${lead.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Lead Available</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
              ${proExclusiveBanner}
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #5b21b6; margin: 0;">🎯 New Lead Available</h1>
              </div>
              
              <p>Hi ${name},</p>
              
              <p>A new project has just been posted on Digs & Gigs:</p>
              
              <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h2 style="margin: 0 0 16px 0; color: #111827;">${lead.title}</h2>
                
                <p style="margin: 0 0 12px 0;"><strong>Description:</strong><br>${shortDescription}</p>
                
                ${lead.requirements ? `<p style="margin: 0 0 12px 0;"><strong>Requirements:</strong><br>${lead.requirements}</p>` : ''}
                
                <p style="margin: 0 0 12px 0;"><strong>Budget Range:</strong> ${budgetRange}</p>
                
                <p style="margin: 0 0 12px 0;"><strong>Timeline:</strong> ${lead.timeline || "Flexible"}</p>
                
                <p style="margin: 0 0 12px 0;"><strong>Location:</strong> ${lead.location || "Not specified"}</p>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <p style="font-size: 24px; font-weight: bold; color: #5b21b6; margin: 0 0 16px 0;">
                  Lead Price: $${priceDollars}
                </p>
                <a href="${unlockUrl}" style="display: inline-block; background: linear-gradient(135deg, #5b21b6, #7c3aed); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 18px;">
                  Unlock This Lead – $${priceDollars}
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 32px;">
                You're receiving this because you're a Digger on Digs & Gigs.<br>
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&type=leads" style="color: #5b21b6;">Unsubscribe from lead notifications</a>
              </p>
            </body>
            </html>
          `,
        });

        emailsSent++;
        console.log(`[blast-lead-to-diggers] Email sent to ${email}`);
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
        const alreadySent = eligibleDiggers.some((d: any) => d.profiles?.email?.toLowerCase() === email.toLowerCase());
        if (alreadySent) continue;

        try {
          // Use subscriber-specific unlock link
          const subscriberUnlockUrl = `${baseUrl}/lead/${leadId}/unlock?sub=${subscriber.id}`;

          await resend.emails.send({
            from: "Digs & Gigs <leads@digsandgigs.net>",
            to: [email],
            subject: `🎯 New Lead: ${lead.title}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Lead Available</title>
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #5b21b6; margin: 0;">🎯 New Lead Available</h1>
                </div>
                
                <p>Hi ${name},</p>
                
                <p>A new project has just been posted on Digs & Gigs:</p>
                
                <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;">
                  <h2 style="margin: 0 0 16px 0; color: #111827;">${lead.title}</h2>
                  
                  <p style="margin: 0 0 12px 0;"><strong>Description:</strong><br>${shortDescription}</p>
                  
                  ${lead.requirements ? `<p style="margin: 0 0 12px 0;"><strong>Requirements:</strong><br>${lead.requirements}</p>` : ''}
                  
                  <p style="margin: 0 0 12px 0;"><strong>Budget Range:</strong> ${budgetRange}</p>
                  
                  <p style="margin: 0 0 12px 0;"><strong>Timeline:</strong> ${lead.timeline || "Flexible"}</p>
                  
                  <p style="margin: 0 0 12px 0;"><strong>Location:</strong> ${lead.location || "Not specified"}</p>
                </div>
                
                <div style="text-align: center; margin: 32px 0;">
                  <p style="font-size: 24px; font-weight: bold; color: #5b21b6; margin: 0 0 16px 0;">
                    Lead Price: $${priceDollars}
                  </p>
                  <a href="${subscriberUnlockUrl}" style="display: inline-block; background: linear-gradient(135deg, #5b21b6, #7c3aed); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 18px;">
                    Unlock This Lead – $${priceDollars}
                  </a>
                </div>
                
                <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>💡 Tip:</strong> Pro Diggers get leads 2 hours earlier. 
                    <a href="${baseUrl}/pro-digger-signup" style="color: #5b21b6; font-weight: bold;">Upgrade to Pro →</a>
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 32px;">
                  You're receiving this because you subscribed to Digs & Gigs lead notifications.<br>
                  <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&type=leads" style="color: #5b21b6;">Unsubscribe from lead notifications</a>
                </p>
              </body>
              </html>
            `,
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
        totalDiggers: eligibleDiggers.length,
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
