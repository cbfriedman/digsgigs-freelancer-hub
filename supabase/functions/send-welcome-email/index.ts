import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400", // 24 hours
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  name?: string;
  role?: 'digger' | 'gigger';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

// Helper to add UTM parameters to URLs
const addUTM = (url: string, source: string = 'email', medium: string = 'welcome', campaign: string = 'onboarding'): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured', details: 'RESEND_API_KEY is missing' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { userId, email, name, role = 'gigger', utmSource, utmMedium, utmCampaign }: WelcomeEmailRequest = await req.json();

    if (!email) {
      console.error('Email is missing from request');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Sending welcome email to:', { email, name, role, userId });

    const firstName = name?.split(' ')[0] || 'there';
    const isDigger = role === 'digger';

    // Generate tracked URLs
    const postGigUrl = addUTM('https://digsandgigs.net/post-gig', 'email', 'welcome', 'first_project');
    const dashboardUrl = addUTM('https://digsandgigs.net/role-dashboard', 'email', 'welcome', 'dashboard');
    const profileUrl = addUTM('https://digsandgigs.net/my-profiles', 'email', 'welcome', 'complete_profile');
    const howItWorksUrl = addUTM('https://digsandgigs.net/how-it-works', 'email', 'welcome', 'learn_more');

    // Different content for Diggers vs Giggers - Updated for pay-per-lead model
    const subject = isDigger 
      ? `🎉 Welcome to Digs & Gigs, ${firstName}! Projects Are Coming`
      : `🎉 Welcome to Digs & Gigs, ${firstName}! Let's Find You a Pro`;

    const headline = isDigger 
      ? "You're in! Get ready to receive project requests delivered straight to your inbox."
      : "You're in! Let's find you a pro.";

    const heroCtaUrl = isDigger ? dashboardUrl : postGigUrl;
    const heroCtaText = isDigger ? "Check Your Inbox for Leads →" : "Post Your First Project →";

    // Step content based on role - Updated for pay-per-lead model
    const steps = isDigger ? [
      { number: "1", title: "Clients post projects", description: "We email them directly to you" },
      { number: "2", title: "You see the details", description: "Scope, budget, timeline" },
      { number: "3", title: "Pay a small fee to unlock", description: "Client contact info (starting at $10)" },
      { number: "4", title: "Connect directly and win", description: "No platform commission on your earnings" },
    ] : [
      { number: "1", title: "Post Your Project", description: "Describe what you need — big or small. Takes 2 minutes." },
      { number: "2", title: "Get Free Quotes", description: "Verified pros in your area will reach out with quotes." },
      { number: "3", title: "Hire & Relax", description: "Compare quotes, check reviews, and hire with confidence." },
    ];

    const stepsHtml = steps.map(step => `
      <tr>
        <td style="width: 50px; vertical-align: top; padding: 10px 0;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px; font-weight: bold; font-size: 16px;">${step.number}</div>
        </td>
        <td style="vertical-align: top; padding: 10px 0 10px 10px;">
          <p style="margin: 0 0 4px 0; font-weight: bold; font-size: 16px; color: #333;">${step.title}</p>
          <p style="margin: 0; font-size: 14px; color: #666;">${step.description}</p>
        </td>
      </tr>
    `).join('');

    // Benefits section for Diggers
    const diggerBenefits = isDigger ? `
      <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
        <h3 style="margin: 0 0 15px 0; color: #667eea;">🎁 Your Welcome Benefits:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;"><strong>$0 setup fee</strong> (normally $199)</li>
          <li style="margin-bottom: 8px;"><strong>Dynamic lead pricing</strong> starting at just $10</li>
          <li style="margin-bottom: 8px;"><strong>Full refund</strong> on any bogus leads</li>
          <li><strong>Non-exclusive leads</strong> — pursue as many as you want</li>
        </ul>
      </div>
    ` : '';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Attempting to send email via Resend...');
    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <hello@digsandgigs.net>",
      to: [email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">${headline}</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Welcome to the easiest way to ${isDigger ? 'get leads' : 'hire pros'}.</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                ${isDigger 
                  ? "You're in! Get ready to receive project requests delivered straight to your inbox."
                  : "Thanks for signing up! You're now connected to our network of verified professionals ready to help with your project."
                }
              </p>
              
              ${diggerBenefits}
              
              <!-- Hero CTA -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${heroCtaUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">${heroCtaText}</a>
              </div>
              
              <!-- How it works -->
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0;">
                <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #333;">Here's how it works:</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  ${stepsHtml}
                </table>
              </div>
              
              <!-- Secondary CTA -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${isDigger ? profileUrl : howItWorksUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">${isDigger ? 'Complete Your Profile' : 'Learn More'}</a>
              </div>
              
              <!-- Trust signals -->
              <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f4ff; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  ${isDigger 
                    ? 'Unlike other platforms that take 15-20% of every project, we charge a small upfront fee and you keep everything you earn.' 
                    : '96% of projects receive responses within 24 hours'}
                </p>
              </div>
              
              ${isDigger ? `
              <!-- Closing for Diggers -->
              <div style="border-top: 1px solid #e0e0e0; padding-top: 25px; margin-top: 30px;">
                <p style="font-size: 14px; color: #666; text-align: center; margin: 0;">
                  Over the next few days, I'll share tips to help you win more projects.
                </p>
              </div>
              ` : `
              <!-- Questions for Giggers -->
              <div style="border-top: 1px solid #e0e0e0; padding-top: 25px; margin-top: 30px;">
                <p style="font-size: 14px; margin: 0;">
                  <strong>Questions?</strong> Just reply to this email — we're here to help!
                </p>
              </div>
              `}
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Thanks for joining Digs & Gigs!<br>
                <em>— The Digs & Gigs Team</em>
              </p>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                <a href="https://digsandgigs.net" style="color: #667eea; text-decoration: none;">Digs & Gigs</a> | 
                <a href="https://digsandgigs.net/faq" style="color: #667eea; text-decoration: none;">FAQ</a> | 
                <a href="https://digsandgigs.net/email-preferences" style="color: #667eea; text-decoration: none;">Email Preferences</a> |
                <a href="https://digsandgigs.net/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 11px;">© 2026 Digs & Gigs. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });

    // Check if email was sent successfully
    if (emailResponse.error) {
      console.error('Resend API error:', emailResponse.error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email', 
          details: emailResponse.error.message || 'Unknown error from Resend API'
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Welcome email sent successfully:", { 
      emailId: emailResponse.data?.id, 
      email: email,
      to: emailResponse.data?.to 
    });

    // Log to marketing_email_log database
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: logError } = await supabase
        .from('marketing_email_log')
        .insert({
          email: email,
          email_type: 'welcome',
          reason: `welcome_${role}`,
          user_id: userId,
          campaign_name: utmCampaign || 'onboarding',
        });

      if (logError) {
        console.error('Failed to log welcome email to database:', logError);
        // Don't fail the request if logging fails
      } else {
        console.log('Welcome email logged to database successfully');
      }
    } catch (logErr) {
      console.error('Error logging welcome email:', logErr);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", {
      message: error?.message,
      stack: error?.stack,
      error: error,
    });
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error',
        details: error?.stack || 'No additional details'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
