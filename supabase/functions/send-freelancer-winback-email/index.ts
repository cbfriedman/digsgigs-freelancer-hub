import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WinbackEmailRequest {
  email: string;
  firstName: string;
  step: number; // 1, 2, or 3
  leadFeedLink: string;
}

const getEmailContent = (step: number, firstName: string, leadFeedLink: string) => {
  const baseUrl = "https://digsandgigs.net";
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=`;
  
  switch (step) {
    case 1:
      return {
        subject: "New projects posted — take another look",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">Digs & Gigs</h1>
  </div>
  
  <h2 style="color: #1f2937;">We Miss You! 👋</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>New opportunities were posted in your categories today. Now's a great time to jump back in and connect with clients who need your skills.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${leadFeedLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Explore Projects</a>
  </div>
  
  <p><strong>What's new:</strong></p>
  <ul style="padding-left: 20px;">
    <li>Fresh project postings in your service areas</li>
    <li>Clients actively looking for professionals like you</li>
    <li>Your Founder benefits are still active</li>
  </ul>
  
  <p style="margin-top: 30px;">— The Digs & Gigs Team</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #6b7280; text-align: center;">
    <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a> | 
    <a href="${baseUrl}/privacy" style="color: #6b7280;">Privacy Policy</a>
  </p>
</body>
</html>
        `,
      };
    
    case 2:
      return {
        subject: "Don't lose your Founder benefits",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">Digs & Gigs</h1>
  </div>
  
  <h2 style="color: #1f2937;">Your Founder Benefits Are Waiting 🏆</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>As a Founding Digger, you have exclusive benefits that most freelancers will never get:</p>
  
  <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
    <ul style="margin: 0; padding-left: 20px;">
      <li><strong>$19/month</strong> lifetime subscription (locked forever)</li>
      <li><strong>$10/$25</strong> lead pricing for your first year</li>
      <li><strong>Priority ranking</strong> in search results</li>
      <li><strong>Founding Digger badge</strong> on your profile</li>
    </ul>
  </div>
  
  <p>Don't let these go to waste. Clients are posting projects every day.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${leadFeedLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Re-engage Now</a>
  </div>
  
  <p style="margin-top: 30px;">— The Digs & Gigs Team</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #6b7280; text-align: center;">
    <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a> | 
    <a href="${baseUrl}/privacy" style="color: #6b7280;">Privacy Policy</a>
  </p>
</body>
</html>
        `,
      };
    
    case 3:
      return {
        subject: "Ready to grow again?",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">Digs & Gigs</h1>
  </div>
  
  <h2 style="color: #1f2937;">Your Skills Are in Demand 💼</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>Your skills are in demand. Check out what clients are posting today — there might be the perfect project waiting for you.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${leadFeedLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">View New Projects</a>
  </div>
  
  <p><strong>Why freelancers choose Digs & Gigs:</strong></p>
  <ul style="padding-left: 20px;">
    <li>No commissions — keep 100% of what you earn</li>
    <li>No bidding wars — pay once to unlock client contact</li>
    <li>Direct client communication — you're in control</li>
  </ul>
  
  <p>We're here when you're ready to grow your business again.</p>
  
  <p style="margin-top: 30px;">— The Digs & Gigs Team</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #6b7280; text-align: center;">
    <a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a> | 
    <a href="${baseUrl}/privacy" style="color: #6b7280;">Privacy Policy</a>
  </p>
</body>
</html>
        `,
      };
    
    default:
      throw new Error(`Invalid step: ${step}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, step, leadFeedLink }: WinbackEmailRequest = await req.json();

    console.log(`Sending freelancer win-back email step ${step} to ${email}`);

    const { subject, html } = getEmailContent(step, firstName, leadFeedLink);

    const emailResponse = await resend.emails.send({
      from: "Digs & Gigs <notifications@digsandgigs.net>",
      to: [email],
      subject,
      html,
    });

    console.log("Freelancer win-back email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending freelancer win-back email:", error);
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
