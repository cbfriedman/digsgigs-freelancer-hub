import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsumerEmailRequest {
  email: string;
  firstName: string;
  step: number; // 1, 2, or 3
  projectLink: string;
  projectName?: string;
}

const getEmailContent = (step: number, firstName: string, projectLink: string, projectName?: string) => {
  const baseUrl = "https://digsandgigs.net";
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=`;
  
  switch (step) {
    case 1:
      return {
        subject: "Your project is live on Digs & Gigs!",
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
  
  <h2 style="color: #1f2937;">Your Project is Live! 🎉</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>Great news! Your project has been posted and freelancers are reviewing it now. Expect messages shortly.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${projectLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Manage Your Project</a>
  </div>
  
  <p><strong>What happens next:</strong></p>
  <ul style="padding-left: 20px;">
    <li>Freelancers in your area will see your project</li>
    <li>Qualified professionals will reach out to you directly</li>
    <li>You can compare profiles and choose the best fit</li>
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
        subject: "Freelancers are ready to help with your project",
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
  
  <h2 style="color: #1f2937;">Freelancers Matched! 🎯</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>We found freelancers who match your project. They're qualified, available, and ready to help.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${projectLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">View Matching Freelancers</a>
  </div>
  
  <p><strong>Tips for choosing the right freelancer:</strong></p>
  <ul style="padding-left: 20px;">
    <li>Review their portfolio and past work</li>
    <li>Check ratings and reviews from other clients</li>
    <li>Look for relevant experience in your industry</li>
    <li>Respond promptly to messages</li>
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
    
    case 3:
      return {
        subject: "Still need help with your project?",
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
  
  <h2 style="color: #1f2937;">Your Project is Waiting 👋</h2>
  
  <p>Hi ${firstName},</p>
  
  <p>Your project is still active and freelancers are available to help. Don't miss out on connecting with the right professional.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${projectLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Review Proposals</a>
  </div>
  
  <p>If you've already found someone or no longer need help, you can close your project from the dashboard.</p>
  
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
    const { email, firstName, step, projectLink, projectName }: ConsumerEmailRequest = await req.json();

    console.log(`Sending consumer onboarding email step ${step} to ${email}`);

    const { subject, html } = getEmailContent(step, firstName, projectLink, projectName);

    const emailResponse = await resend.emails.send({
      from: "Digs & Gigs <notifications@digsandgigs.net>",
      to: [email],
      subject,
      html,
    });

    console.log("Consumer onboarding email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending consumer onboarding email:", error);
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
