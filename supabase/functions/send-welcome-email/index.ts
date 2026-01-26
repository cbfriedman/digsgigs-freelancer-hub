import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
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
    const { userId, email, name, role = 'gigger', utmSource, utmMedium, utmCampaign }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log('Sending welcome email to:', { email, name, role });

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
      ? "You're in! Projects are on the way."
      : "You're in! Let's find you a pro.";

    const heroCtaUrl = isDigger ? dashboardUrl : postGigUrl;
    const heroCtaText = isDigger ? "Check Your Inbox for Leads →" : "Post Your First Project →";

    // Step content based on role - Updated for pay-per-lead model
    const steps = isDigger ? [
      { number: "1", title: "Receive Project Emails", description: "We send matching projects directly to your inbox." },
      { number: "2", title: "Unlock Leads You Want", description: "Pay a small fee ($10-$49) to reveal client contact info." },
      { number: "3", title: "Win Work & Keep 100%", description: "Reach out directly. No commissions on your earnings." },
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
          <li><strong>Keep 100%</strong> of your project earnings</li>
        </ul>
      </div>
    ` : '';

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
                  ? "Thanks for joining! You're now set up to receive project leads directly in your inbox. No browsing, no bidding wars — just relevant projects delivered to you."
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
                    ? 'Unlike other platforms that take 15-20%, we charge a small upfront fee and you keep everything you earn.' 
                    : '96% of projects receive responses within 24 hours'}
                </p>
              </div>
              
              <!-- Questions -->
              <div style="border-top: 1px solid #e0e0e0; padding-top: 25px; margin-top: 30px;">
                <p style="font-size: 14px; margin: 0;">
                  <strong>Questions?</strong> Just reply to this email — we're here to help!
                </p>
              </div>
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

    console.log("Welcome email sent successfully:", emailResponse);

    // Log to marketing_email_log database
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
      console.error('Failed to log welcome email:', logError);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
