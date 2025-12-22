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
};

interface ReengagementEmailRequest {
  userId?: string;
  email?: string;
  name?: string;
  reason?: 'inactive' | 'abandoned_project' | 'no_bids';
}

// Helper to add UTM parameters to URLs
const addUTM = (url: string, reason: string, content: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}utm_source=email&utm_medium=reengagement&utm_campaign=${encodeURIComponent(reason)}&utm_content=${encodeURIComponent(content)}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, name, reason = 'inactive' }: ReengagementEmailRequest = await req.json();

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let recipientEmail = email;
    let recipientName = name;

    // If userId provided, fetch user details
    if (userId && !email) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();
      
      if (error || !profile) {
        throw new Error('User not found');
      }
      
      recipientEmail = profile.email;
      recipientName = profile.full_name;
    }

    if (!recipientEmail) {
      throw new Error('Email is required');
    }

    console.log('Sending re-engagement email to:', { recipientEmail, reason });

    const firstName = recipientName?.split(' ')[0] || 'there';

    // Generate tracked URLs based on reason
    const ctaUrlTop = addUTM('https://digsandgigs.net/post-gig', reason, 'hero_cta');
    const ctaUrlMiddle = addUTM('https://digsandgigs.net/post-gig', reason, 'middle_cta');
    const ctaUrlBottom = addUTM('https://digsandgigs.net/post-gig', reason, 'bottom_cta');
    const ctaUrlPS = addUTM('https://digsandgigs.net/post-gig', reason, 'ps_cta');

    // Choose subject, headline, and urgency message based on reason
    let subject: string;
    let headline: string;
    let urgencyLine: string;
    let mainMessage: string;
    let psLine: string;

    switch (reason) {
      case 'abandoned_project':
        subject = "⏰ Your draft expires in 48 hours";
        headline = "Finish in 60 seconds";
        urgencyLine = "Your project draft will be deleted in 48 hours";
        mainMessage = "You were <strong>one click away</strong> from getting free quotes. Your draft is still saved — just hit continue.";
        psLine = "Even if details aren't perfect, pros can clarify. Just submit what you have.";
        break;
      case 'no_bids':
        subject = "🔄 We found 12 new pros for your project";
        headline = "Try again — free";
        urgencyLine = "12 new professionals just joined your area";
        mainMessage = "Last time didn't work out — but we've onboarded <strong>new verified pros</strong> who specialize in projects like yours.";
        psLine = "Tip: Add a photo this time — projects with images get 3x more quotes.";
        break;
      default: // 'inactive'
        subject = "👋 Quick question (takes 10 seconds)";
        headline = "Still need help?";
        urgencyLine = "342 pros helped homeowners this week";
        mainMessage = "If you have <strong>anything</strong> on your to-do list — big or small — our pros are ready. Most respond within hours.";
        psLine = "Even \"I need someone to hang a TV\" counts. What's on your list?";
    }

    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <hello@digsandgigs.net>",
      to: [recipientEmail],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
            
            <!-- Header with urgency -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">⚡ ${urgencyLine}</p>
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${headline}</h1>
            </div>
            
            <div style="padding: 25px; background: #ffffff;">
              
              <!-- FIRST CTA - Above the fold -->
              <div style="text-align: center; margin: 0 0 25px 0;">
                <a href="${ctaUrlTop}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Get Free Quotes →</a>
              </div>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">${mainMessage}</p>
              
              <!-- Quick benefits -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;">✅ Still 100% free to post</p>
                <p style="margin: 0 0 10px 0;">✅ No obligation to hire</p>
                <p style="margin: 0;">✅ Compare quotes side-by-side</p>
              </div>
              
              <!-- SECOND CTA -->
              <div style="text-align: center; margin: 25px 0;">
                <a href="${ctaUrlMiddle}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Post a Project (2 min)</a>
              </div>
              
              <!-- Social proof -->
              <div style="text-align: center; margin: 25px 0; padding: 15px; background: #f0f4ff; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px;">
                  ⭐⭐⭐⭐⭐ <strong>4.8/5</strong> from 2,340+ homeowners
                </p>
              </div>
              
              <!-- THIRD CTA -->
              <div style="text-align: center; margin: 25px 0;">
                <a href="${ctaUrlBottom}" style="display: inline-block; background: #22c55e; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Yes, I Need Help →</a>
              </div>
              
              <!-- PS -->
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 25px;">
                <p style="font-size: 14px; margin: 0;"><strong>P.S.</strong> ${psLine} <a href="${ctaUrlPS}" style="color: #667eea; font-weight: bold;">Post it now →</a></p>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
                <a href="${addUTM('https://digsandgigs.net', reason, 'footer_home')}" style="color: #667eea; text-decoration: none;">Digs and Gigs</a> | 
                <a href="${addUTM('https://digsandgigs.net/faq', reason, 'footer_faq')}" style="color: #667eea; text-decoration: none;">FAQ</a> | 
                <a href="${addUTM('https://digsandgigs.net/email-preferences', reason, 'footer_prefs')}" style="color: #667eea; text-decoration: none;">Preferences</a> |
                <a href="https://digsandgigs.net/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
              <p style="margin: 0; color: #999; font-size: 11px;">© 2025 Digs and Gigs. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Re-engagement email sent successfully:", emailResponse);

    // Log to database
    const { error: logError } = await supabase
      .from('marketing_email_log')
      .insert({
        email: recipientEmail,
        email_type: 'reengagement',
        reason: reason,
        user_id: userId || null
      });

    if (logError) {
      console.error('Failed to log email:', logError);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending re-engagement email:", error);
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
