import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface MarketingEmailRequest {
  email: string;
  name?: string;
  campaign?: string;
  /** Sender address, e.g. "Digs and Gigs <hello@digsandgigs.net>" or "hello@digsandgigs.net" */
  from?: string;
  /** Email subject line */
  subject?: string;
  /** HTML body from admin rich editor. If provided, used as email body (wrapped in minimal layout). */
  html?: string;
}

// Helper to add UTM parameters to URLs
const addUTM = (url: string, campaign: string, content: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}utm_source=email&utm_medium=marketing&utm_campaign=${encodeURIComponent(campaign)}&utm_content=${encodeURIComponent(content)}`;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const raw = await req.json() as Record<string, unknown>;
    // Support both direct body and wrapped { body: { ... } } (some gateways wrap)
    const body = (raw?.body && typeof raw.body === 'object' && !Array.isArray(raw.body))
      ? (raw.body as Record<string, unknown>)
      : raw;

    const email = body.email as string;
    const name = body.name as string | undefined;
    const campaign = (body.campaign as string) || 'gigger_acquisition';
    const fromOverride = body.from as string | undefined;
    const subjectOverride = body.subject as string | undefined;
    const customHtml = body.html as string | undefined;

    const fromAddress = (fromOverride && String(fromOverride).trim()) || "Digs and Gigs <hello@digsandgigs.net>";
    const subject = (subjectOverride && String(subjectOverride).trim()) || "This week only: Skip the wait — pros respond in hours ⚡";

    console.log('Sending marketing email:', {
      email,
      campaign,
      fromAddress,
      subject: subject.substring(0, 60),
      customHtmlLength: customHtml ? String(customHtml).length : 0,
    });

    const firstName = name?.split(' ')[0] || 'there';
    
    // Generate tracked URLs (for default template)
    const ctaUrlTop = addUTM('https://digsandgigs.net/post-gig', campaign, 'hero_cta');
    const ctaUrlMiddle = addUTM('https://digsandgigs.net/post-gig', campaign, 'middle_cta');
    const ctaUrlBottom = addUTM('https://digsandgigs.net/post-gig', campaign, 'bottom_cta');
    const ctaUrlPS = addUTM('https://digsandgigs.net/post-gig', campaign, 'ps_cta');
    const browseUrl = addUTM('https://digsandgigs.net/browse-diggers', campaign, 'browse_pros');

    const defaultEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
          
          <!-- Header with urgency -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">⏰ Limited time</p>
            <h1 style="margin: 0; font-size: 26px; font-weight: bold;">Get 3+ Quotes by Tomorrow</h1>
          </div>
          
          <div style="padding: 25px; background: #ffffff;">
            
            <!-- FIRST CTA - Above the fold -->
            <div style="text-align: center; margin: 0 0 25px 0;">
              <a href="${ctaUrlTop}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Post Your Project Free →</a>
            </div>
            
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
            
            <!-- Social proof - specific numbers -->
            <p style="font-size: 16px; margin: 0 0 20px 0;"><strong>847 homeowners</strong> posted projects last week. Average response time? <strong>Under 4 hours.</strong></p>
            
            <!-- Simple value props -->
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 12px 0;">✅ <strong>Free to post</strong> — no credit card needed</p>
              <p style="margin: 0 0 12px 0;">✅ <strong>Get multiple quotes</strong> — compare before you commit</p>
              <p style="margin: 0;">✅ <strong>Verified pros only</strong> — licensed & reviewed</p>
            </div>
            
            <!-- SECOND CTA -->
            <div style="text-align: center; margin: 25px 0;">
              <a href="${ctaUrlMiddle}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Describe Your Project (2 min)</a>
            </div>
            
            <!-- Testimonial -->
            <div style="border-left: 4px solid #667eea; padding: 15px 20px; margin: 25px 0; background: #f0f4ff;">
              <p style="margin: 0 0 8px 0; font-style: italic;">"Posted at 9am, had 4 quotes by lunch. Hired a plumber that afternoon. So easy!"</p>
              <p style="margin: 0; font-size: 14px; color: #666;">— Sarah K., Austin TX</p>
            </div>
            
            <!-- Urgency -->
            <p style="font-size: 16px; text-align: center; margin: 25px 0;">
              <strong>👷 127 pros are online now</strong> waiting for new projects
            </p>
            
            <!-- THIRD CTA -->
            <div style="text-align: center; margin: 25px 0;">
              <a href="${ctaUrlBottom}" style="display: inline-block; background: #22c55e; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Get Free Quotes Now →</a>
            </div>
            
            <!-- Alternative action -->
            <p style="text-align: center; font-size: 14px; color: #666; margin: 20px 0;">
              Or <a href="${browseUrl}" style="color: #667eea;">browse available pros</a> in your area
            </p>
            
            <!-- PS - High performers -->
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 25px;">
              <p style="font-size: 14px; margin: 0;"><strong>P.S.</strong> Not ready for a full project? Even "I need someone to look at my leaky faucet" works. <a href="${ctaUrlPS}" style="color: #667eea; font-weight: bold;">Post it anyway →</a></p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
              <a href="${addUTM('https://digsandgigs.net', campaign, 'footer_home')}" style="color: #667eea; text-decoration: none;">Digs and Gigs</a> | 
              <a href="${addUTM('https://digsandgigs.net/faq', campaign, 'footer_faq')}" style="color: #667eea; text-decoration: none;">FAQ</a> | 
              <a href="https://digsandgigs.net/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
            </p>
            <p style="margin: 0; color: #999; font-size: 11px;">© 2025 Digs and Gigs. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Use admin-provided HTML if present; otherwise default template
    const rawHtml = (customHtml?.trim())
      ? customHtml.trim()
      : defaultEmailHtml;
    const emailHtml = rawHtml.startsWith('<!DOCTYPE') || rawHtml.startsWith('<!doctype')
      ? rawHtml
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">${rawHtml}<p style="margin-top: 24px; font-size: 12px; color: #666;"><a href="https://digsandgigs.net/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a></p></body></html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${emailResponse.status} ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log("Marketing email sent successfully:", emailData);

    // Log to database with campaign tracking
    const { error: logError } = await supabase
      .from('marketing_email_log')
      .insert({
        email,
        email_type: 'marketing',
        campaign_name: campaign
      });

    if (logError) {
      console.error('Failed to log email:', logError);
    }

    return new Response(JSON.stringify({ success: true, emailData }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending marketing email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
