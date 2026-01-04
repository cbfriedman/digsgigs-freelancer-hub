import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = ["coby@cfcontracting.com", "webservicewang@gmail.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    console.log("New signup notification request:", JSON.stringify(body));

    const {
      user_email,
      user_name,
      user_id,
      role,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      landing_page,
      referrer,
      device_type,
      browser,
    } = body;

    if (!user_email || !role) {
      return new Response(
        JSON.stringify({ error: "user_email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format UTM info for email
    const utmInfo = [];
    if (utm_source) utmInfo.push(`<strong>Source:</strong> ${utm_source}`);
    if (utm_medium) utmInfo.push(`<strong>Medium:</strong> ${utm_medium}`);
    if (utm_campaign) utmInfo.push(`<strong>Campaign:</strong> ${utm_campaign}`);
    if (utm_content) utmInfo.push(`<strong>Content:</strong> ${utm_content}`);
    if (utm_term) utmInfo.push(`<strong>Term:</strong> ${utm_term}`);

    const utmSection = utmInfo.length > 0 
      ? `<div style="background: #f0f9ff; padding: 12px; border-radius: 8px; margin: 16px 0;">
          <strong style="color: #0369a1;">📊 Campaign Attribution</strong><br/>
          ${utmInfo.join("<br/>")}
        </div>`
      : `<div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 16px 0;">
          <strong style="color: #92400e;">⚠️ No UTM Parameters</strong><br/>
          This signup came through direct traffic or bookmarks.
        </div>`;

    const roleEmoji = role === 'digger' ? '🔧' : '📋';
    const roleLabel = role === 'digger' ? 'Digger (Service Provider)' : 'Gigger (Customer)';
    const isPaidAd = utm_source === 'facebook' || utm_source === 'meta' || utm_source === 'google';
    const priorityLabel = isPaidAd ? '🔥 PAID AD CONVERSION' : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
              ${priorityLabel ? priorityLabel + '<br/>' : ''}
              🎉 New ${role === 'digger' ? 'Digger' : 'Gigger'} Signup!
            </h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 24px;">
            
            <!-- User Info -->
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 12px 0; color: #374151;">👤 User Details</h3>
              <p style="margin: 4px 0;"><strong>Name:</strong> ${user_name || 'Not provided'}</p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${user_email}</p>
              <p style="margin: 4px 0;"><strong>Role:</strong> ${roleEmoji} ${roleLabel}</p>
              ${user_id ? `<p style="margin: 4px 0; font-size: 12px; color: #6b7280;"><strong>User ID:</strong> ${user_id}</p>` : ''}
            </div>
            
            ${utmSection}
            
            <!-- Device & Context -->
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 12px 0; color: #374151;">📱 Device & Context</h3>
              <p style="margin: 4px 0;"><strong>Device:</strong> ${device_type || 'Unknown'}</p>
              <p style="margin: 4px 0;"><strong>Browser:</strong> ${browser || 'Unknown'}</p>
              ${landing_page ? `<p style="margin: 4px 0;"><strong>Landing Page:</strong> ${landing_page}</p>` : ''}
              ${referrer ? `<p style="margin: 4px 0;"><strong>Referrer:</strong> ${referrer}</p>` : ''}
            </div>
            
            <!-- Timestamp -->
            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
              Signup Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
            </p>
            
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              DigsAndGigs Admin Notification
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    // Send email to all admins
    let emailsSent = 0;
    for (const adminEmail of ADMIN_EMAILS) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "DigsAndGigs <notifications@digsandgigs.com>",
            to: adminEmail,
            subject: `${priorityLabel ? '🔥 ' : ''}New ${role === 'digger' ? 'Digger' : 'Gigger'} Signup: ${user_name || user_email}`,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          emailsSent++;
          console.log(`Email sent successfully to ${adminEmail}`);
        } else {
          const errorText = await emailRes.text();
          console.error(`Failed to send email to ${adminEmail}:`, errorText);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${adminEmail}:`, emailError);
      }
    }

    console.log(`Signup notification completed: ${emailsSent}/${ADMIN_EMAILS.length} emails sent`);
    
    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in notify-new-signup:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
