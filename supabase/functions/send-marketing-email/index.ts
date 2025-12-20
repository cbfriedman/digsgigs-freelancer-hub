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

interface MarketingEmailRequest {
  email: string;
  name?: string;
  campaign?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { email, name, campaign }: MarketingEmailRequest = await req.json();

    console.log('Sending marketing email to:', { email, name, campaign });

    const firstName = name?.split(' ')[0] || 'there';

    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <hello@digsandgigs.net>",
      to: [email],
      subject: "Need a pro? Get free quotes in minutes 🛠️",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Get Your Project Done Right</h1>
              <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 18px;">Free quotes from verified professionals</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px;">Hi ${firstName}! 👋</p>
              
              <p style="font-size: 16px;">Looking for a reliable pro for your next project? <strong>Digs and Gigs</strong> makes it easy to find verified professionals in your area — fast.</p>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h2 style="margin: 0 0 20px 0; color: #667eea; font-size: 20px;">Here's how it works:</h2>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                  <span style="background: #667eea; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">1</span>
                  <div>
                    <strong>Post your project (free!)</strong><br>
                    <span style="color: #666; font-size: 14px;">Describe what you need done — takes 2 minutes</span>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                  <span style="background: #667eea; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">2</span>
                  <div>
                    <strong>Get matched with pros</strong><br>
                    <span style="color: #666; font-size: 14px;">We connect you with verified professionals nearby</span>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start;">
                  <span style="background: #667eea; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">3</span>
                  <div>
                    <strong>Compare quotes & hire</strong><br>
                    <span style="color: #666; font-size: 14px;">Review options and pick the best fit for you</span>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://digsandgigs.net/post-gig" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Post Your Project Free</a>
              </div>
              
              <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
                <strong>✅ Why homeowners love us:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #333;">
                  <li><strong>100% free to post</strong> — no hidden fees</li>
                  <li><strong>Multiple quotes</strong> — compare options easily</li>
                  <li><strong>Verified pros</strong> — licensed & reviewed</li>
                  <li><strong>Fast matches</strong> — get responses within hours</li>
                </ul>
              </div>
              
              <p style="font-size: 16px; margin-top: 25px;">Ready to get started? It only takes 2 minutes to post your project.</p>
              
              <p style="color: #666; font-size: 14px;">Questions? Just reply to this email — we're here to help!</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
                <a href="https://digsandgigs.net" style="color: #667eea; text-decoration: none;">Visit Digs and Gigs</a> | 
                <a href="https://digsandgigs.net/faq" style="color: #667eea; text-decoration: none;">FAQ</a> | 
                <a href="https://digsandgigs.net/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
              <p style="margin: 0; color: #999; font-size: 11px;">© 2025 Digs and Gigs. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Marketing email sent successfully:", emailResponse);

    // Log to database
    const { error: logError } = await supabase
      .from('marketing_email_log')
      .insert({
        email,
        email_type: 'marketing',
        campaign_name: campaign || 'default'
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
    console.error("Error sending marketing email:", error);
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
