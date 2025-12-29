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
};

interface CommunityEmailRequest {
  email: string;
  name?: string;
  userType?: 'digger' | 'gigger' | 'all';
}

interface BulkCommunityEmailRequest {
  targetAudience: 'diggers' | 'giggers' | 'all';
  limit?: number;
}

// Helper to add UTM parameters to URLs
const addUTM = (url: string, campaign: string, content: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}utm_source=email&utm_medium=community&utm_campaign=${encodeURIComponent(campaign)}&utm_content=${encodeURIComponent(content)}`;
};

const generateCommunityEmailHtml = (firstName: string, email: string) => {
  const campaign = 'community_launch';
  const communityUrl = addUTM('https://digsandgigs.net/community', campaign, 'hero_cta');
  const forumsUrl = addUTM('https://digsandgigs.net/community/forums', campaign, 'forums_cta');
  const showcaseUrl = addUTM('https://digsandgigs.net/community/showcase', campaign, 'showcase_cta');
  const profileUrl = addUTM('https://digsandgigs.net/profile-dashboard', campaign, 'profile_cta');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 40px 30px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 2px;">🚀 Introducing</p>
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">The Digs and Gigs Community</h1>
          <p style="margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">Connect. Share. Grow. Together.</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          
          <p style="font-size: 18px; margin: 0 0 20px 0;">Hey ${firstName}! 👋</p>
          
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            We're excited to announce something big: <strong>The Digs and Gigs Community</strong> is now live!
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0;">
            Think LinkedIn, but <em>actually useful</em> for contractors and homeowners. A place where pros connect, share wins, and homeowners find inspiration for their next project.
          </p>

          <!-- Primary CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${communityUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">Join the Community →</a>
          </div>

          <!-- Features Grid -->
          <h2 style="font-size: 20px; margin: 35px 0 20px 0; text-align: center;">What's Inside?</h2>
          
          <div style="display: block;">
            <!-- Forums -->
            <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8f4f8 100%); border-radius: 12px; padding: 25px; margin: 15px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1a1a2e;">💬 Discussion Forums</h3>
              <p style="margin: 0 0 15px 0; color: #555;">Get advice, share tips, and connect with fellow pros. Ask questions, get real answers from people who've been there.</p>
              <a href="${forumsUrl}" style="color: #667eea; font-weight: bold; text-decoration: none;">Browse Forums →</a>
            </div>
            
            <!-- Project Showcases -->
            <div style="background: linear-gradient(135deg, #fff5f0 0%, #fef3e8 100%); border-radius: 12px; padding: 25px; margin: 15px 0; border-left: 4px solid #f97316;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1a1a2e;">🏆 Project Showcases</h3>
              <p style="margin: 0 0 15px 0; color: #555;">Show off your best work! Before/after photos, testimonials, and the stories behind your projects. Get featured and inspire others.</p>
              <a href="${showcaseUrl}" style="color: #f97316; font-weight: bold; text-decoration: none;">View Showcases →</a>
            </div>
            
            <!-- Networking -->
            <div style="background: linear-gradient(135deg, #f0fff4 0%, #e8fef3 100%); border-radius: 12px; padding: 25px; margin: 15px 0; border-left: 4px solid #22c55e;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1a1a2e;">🤝 Pro-to-Pro Networking</h3>
              <p style="margin: 0 0 15px 0; color: #555;">Build referral relationships, find subcontractors, or team up on bigger projects. Your network is your net worth.</p>
              <a href="${profileUrl}" style="color: #22c55e; font-weight: bold; text-decoration: none;">Update Your Profile →</a>
            </div>
          </div>

          <!-- Social Proof -->
          <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1a1a2e;">500+ Members Already Inside</p>
            <p style="margin: 10px 0 0 0; color: #666;">Join the conversation before it takes off!</p>
          </div>

          <!-- Secondary CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${communityUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Explore the Community →</a>
          </div>

          <!-- Testimonial -->
          <div style="border-left: 4px solid #667eea; padding: 15px 20px; margin: 25px 0; background: #f0f4ff; border-radius: 0 12px 12px 0;">
            <p style="margin: 0 0 8px 0; font-style: italic; font-size: 15px;">"Finally, a place where I can actually talk shop with other contractors without the noise. Already got two referrals from the forum!"</p>
            <p style="margin: 0; font-size: 14px; color: #666;">— Mike R., Electrician, Denver CO</p>
          </div>

          <!-- PS -->
          <div style="border-top: 1px solid #e0e0e0; padding-top: 25px; margin-top: 30px;">
            <p style="font-size: 14px; margin: 0 0 10px 0;"><strong>P.S.</strong> Early members get special perks. The first 1,000 members will be featured as "Founding Members" with a special badge on their profiles.</p>
            <p style="font-size: 14px; margin: 0;"><strong>P.P.S.</strong> Coming soon: Sponsored showcases and advertising opportunities for tool brands and suppliers. Want early access? <a href="mailto:advertise@digsandgigs.net" style="color: #667eea;">Contact us →</a></p>
          </div>
        </div>
        
        <div style="background: #1a1a2e; padding: 25px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.8); font-size: 12px;">
            <a href="${addUTM('https://digsandgigs.net', 'community_launch', 'footer_home')}" style="color: #667eea; text-decoration: none;">Digs and Gigs</a> | 
            <a href="${addUTM('https://digsandgigs.net/community', 'community_launch', 'footer_community')}" style="color: #667eea; text-decoration: none;">Community</a> | 
            <a href="https://digsandgigs.net/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
          </p>
          <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 11px;">© 2025 Digs and Gigs. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();

    // Check if bulk send or single email
    if (body.targetAudience) {
      // Bulk send
      const { targetAudience, limit = 100 }: BulkCommunityEmailRequest = body;
      console.log('Bulk community email request:', { targetAudience, limit });

      let query = supabase
        .from('profiles')
        .select('id, email, full_name, user_type')
        .not('email', 'is', null);

      if (targetAudience === 'diggers') {
        query = query.eq('user_type', 'digger');
      } else if (targetAudience === 'giggers') {
        query = query.eq('user_type', 'consumer');
      }

      const { data: users, error: usersError } = await query.limit(limit);

      if (usersError) throw usersError;

      console.log(`Found ${users?.length || 0} users to email`);

      let sentCount = 0;
      let errorCount = 0;

      for (const user of users || []) {
        if (!user.email) continue;

        const firstName = user.full_name?.split(' ')[0] || 'there';

        try {
          await resend.emails.send({
            from: "Digs and Gigs Community <community@digsandgigs.net>",
            to: [user.email],
            subject: "🚀 You're Invited: The Digs and Gigs Community is Live!",
            html: generateCommunityEmailHtml(firstName, user.email),
          });

          // Log to database
          await supabase
            .from('marketing_email_log')
            .insert({
              email: user.email,
              email_type: 'community',
              campaign_name: 'community_launch'
            });

          sentCount++;
        } catch (err) {
          console.error(`Failed to send to ${user.email}:`, err);
          errorCount++;
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        sentCount, 
        errorCount,
        message: `Sent ${sentCount} community emails (${errorCount} errors)`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else {
      // Single email
      const { email, name }: CommunityEmailRequest = body;
      console.log('Sending community email to:', { email, name });

      const firstName = name?.split(' ')[0] || 'there';

      const emailResponse = await resend.emails.send({
        from: "Digs and Gigs Community <community@digsandgigs.net>",
        to: [email],
        subject: "🚀 You're Invited: The Digs and Gigs Community is Live!",
        html: generateCommunityEmailHtml(firstName, email),
      });

      console.log("Community email sent successfully:", emailResponse);

      // Log to database
      const { error: logError } = await supabase
        .from('marketing_email_log')
        .insert({
          email,
          email_type: 'community',
          campaign_name: 'community_launch'
        });

      if (logError) {
        console.error('Failed to log email:', logError);
      }

      return new Response(JSON.stringify({ success: true, emailResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (error: any) {
    console.error("Error sending community email:", error);
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
