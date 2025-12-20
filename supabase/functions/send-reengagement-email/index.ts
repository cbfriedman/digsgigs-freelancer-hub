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

    // Choose subject and content based on reason
    let subject: string;
    let heroText: string;
    let mainMessage: string;

    switch (reason) {
      case 'abandoned_project':
        subject = "Your project is waiting! Let's find you a pro 🔧";
        heroText = "Finish posting your project";
        mainMessage = "We noticed you started posting a project but didn't finish. Good news — it only takes a minute to complete, and pros in your area are ready to help!";
        break;
      case 'no_bids':
        subject = "Still need help with your project? We've got pros ready 🛠️";
        heroText = "Let's try again";
        mainMessage = "Your last project didn't get the response you hoped for. We've improved our matching, and there are new professionals eager to help. Give it another shot!";
        break;
      default: // 'inactive'
        subject = "We miss you! Got a project on your mind? 🏠";
        heroText = "Welcome back!";
        mainMessage = "It's been a while since we've seen you. Whether it's a quick fix or a big renovation, our verified professionals are standing by to help with your next project.";
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
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${heroText}</h1>
              <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 18px;">We're here to help you get things done</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px;">Hey ${firstName}! 👋</p>
              
              <p style="font-size: 16px;">${mainMessage}</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://digsandgigs.net/post-gig" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Post a Project</a>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #667eea;">What can we help with?</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">🔧 <strong>Home repairs</strong></td>
                    <td style="padding: 8px 0;">🎨 <strong>Painting</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">🔌 <strong>Electrical</strong></td>
                    <td style="padding: 8px 0;">🚿 <strong>Plumbing</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">🌳 <strong>Landscaping</strong></td>
                    <td style="padding: 8px 0;">🏗️ <strong>Renovations</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">🧹 <strong>Cleaning</strong></td>
                    <td style="padding: 8px 0;">📦 <strong>Moving</strong></td>
                  </tr>
                </table>
                <p style="margin: 15px 0 0 0; text-align: center; color: #666; font-size: 14px;">...and hundreds more services!</p>
              </div>
              
              <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
                <strong>💡 Quick reminder:</strong> Posting is always free, and there's no obligation to hire. Just post what you need and see what quotes come in!
              </div>
              
              <p style="font-size: 16px;">Ready when you are. We're just a click away!</p>
              
              <p style="color: #666;">— The Digs and Gigs Team</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
                <a href="https://digsandgigs.net" style="color: #667eea; text-decoration: none;">Visit Digs and Gigs</a> | 
                <a href="https://digsandgigs.net/faq" style="color: #667eea; text-decoration: none;">FAQ</a> | 
                <a href="https://digsandgigs.net/email-preferences" style="color: #667eea; text-decoration: none;">Email preferences</a> |
                <a href="https://digsandgigs.net/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
              <p style="margin: 0; color: #999; font-size: 11px;">© 2025 Digs and Gigs. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Re-engagement email sent successfully:", emailResponse);

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
