import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColdEmailRequest {
  leadId: string;
  email: string;
  firstName?: string;
  step: number; // 1, 2, 3, or 4
}

const addUTM = (url: string, step: number): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}utm_source=cold_email&utm_medium=email&utm_campaign=digger_sequence&utm_content=day_${step === 1 ? 0 : step === 2 ? 3 : step === 3 ? 7 : 14}`;
};

const getEmailTemplate = (firstName: string, step: number, leadId: string) => {
  const name = firstName || 'there';
  const unsubscribeUrl = `https://digsandgigs.com/unsubscribe-cold?id=${leadId}`;
  const ctaUrl = addUTM('https://digsandgigs.com/digger-registration', step);
  
  const templates = {
    1: {
      subject: "Get exclusive leads without paying for ads",
      preheader: "Local homeowners are posting projects right now. Be the first to bid.",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Get Exclusive Leads</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">For Contractors & Service Professionals</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Hi ${name},</h2>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Tired of paying $50-$200 per lead on HomeAdvisor or Thumbtack — only to find out 4 other contractors got the same "exclusive" lead?
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Digs and Gigs is different.</strong> Homeowners post their projects, you bid on the ones you want. No lead fees. No middleman markup.
              </p>
              
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 18px;">Why contractors love us:</h3>
                <ul style="color: #4a4a4a; padding-left: 20px; margin: 0;">
                  <li style="margin-bottom: 10px;">🎯 <strong>You choose your leads</strong> — only bid on projects you actually want</li>
                  <li style="margin-bottom: 10px;">💰 <strong>No per-lead fees</strong> — flat monthly subscription or pay-as-you-go</li>
                  <li style="margin-bottom: 10px;">⚡ <strong>Real-time notifications</strong> — be the first to respond</li>
                  <li style="margin-bottom: 10px;">🏆 <strong>Win on quality</strong> — your reviews and portfolio matter here</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">Create Your Free Profile</a>
              </div>
              
              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Takes 5 minutes. Start seeing leads in your area today.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | Where pros find their next project
              </p>
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                123 Main Street, Suite 100, San Francisco, CA 94105
              </p>
              <p style="margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #888888; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    },
    2: {
      subject: '"I closed $47K in jobs last month — all from Digs and Gigs"',
      preheader: "Hear from Mike R., a contractor who switched from Thumbtack",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contractor Success Story</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">For Contractors & Service Professionals</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Hi ${name},</h2>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Last week I told you about Digs and Gigs. Today, I want you to hear from someone who made the switch:
              </p>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #fff 100%); border-left: 4px solid #2563eb; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <p style="color: #4a4a4a; font-size: 16px; font-style: italic; line-height: 1.6; margin: 0 0 15px 0;">
                  "I was spending $800/month on Thumbtack and closing maybe 2-3 jobs. Half the leads were garbage or already called 5 other guys. With Digs and Gigs, I closed $47K in jobs last month. The leads are real, and I only bid on jobs I actually want."
                </p>
                <p style="color: #1a1a1a; font-weight: 600; margin: 0;">
                  — Mike R., General Contractor, Phoenix, AZ
                </p>
              </div>
              
              <h3 style="color: #1a1a1a; font-size: 18px; margin: 25px 0 15px 0;">The math is simple:</h3>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px; background-color: #fee2e2; border-radius: 8px 8px 0 0;">
                    <strong style="color: #dc2626;">Thumbtack/HomeAdvisor:</strong><br>
                    <span style="color: #4a4a4a;">$50-200/lead × 20 leads = $1,000-4,000/month</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #dcfce7; border-radius: 0 0 8px 8px;">
                    <strong style="color: #16a34a;">Digs and Gigs:</strong><br>
                    <span style="color: #4a4a4a;">Flat rate subscription or pay-per-bid. Keep more profit.</span>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">Join Mike and 2,400+ Pros</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | Where pros find their next project
              </p>
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                123 Main Street, Suite 100, San Francisco, CA 94105
              </p>
              <p style="margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #888888; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    },
    3: {
      subject: "23 new projects posted in your area today",
      preheader: "While you're reading this, other contractors are bidding",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Projects in Your Area</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">For Contractors & Service Professionals</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">${name}, quick update:</h2>
              
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fff 100%); border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 0 0 25px 0; text-align: center;">
                <p style="color: #1a1a1a; font-size: 32px; font-weight: 700; margin: 0;">23</p>
                <p style="color: #4a4a4a; font-size: 14px; margin: 5px 0 0 0;">new projects posted in your area today</p>
              </div>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Right now, homeowners are looking for:
              </p>
              
              <ul style="color: #4a4a4a; padding-left: 20px; margin: 0 0 20px 0;">
                <li style="margin-bottom: 8px;">Kitchen remodel — Budget: $15-25K</li>
                <li style="margin-bottom: 8px;">Bathroom renovation — Budget: $8-12K</li>
                <li style="margin-bottom: 8px;">Deck construction — Budget: $5-10K</li>
                <li style="margin-bottom: 8px;">Interior painting (whole house) — Budget: $3-6K</li>
                <li style="margin-bottom: 8px;">HVAC replacement — Budget: $6-10K</li>
              </ul>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                While you're reading this email, <strong>other contractors are already submitting bids</strong> and scheduling consultations.
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                The early bird gets the worm — or in this case, the $15K kitchen job.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">See Projects in Your Area</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | Where pros find their next project
              </p>
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                123 Main Street, Suite 100, San Francisco, CA 94105
              </p>
              <p style="margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #888888; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    },
    4: {
      subject: "Your competition is on here. Are you?",
      preheader: "Final invitation: Join 2,400+ contractors growing their business",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Final Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">For Contractors & Service Professionals</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Hi ${name},</h2>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This is my last email. But before I go, I have to be honest with you:
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Your competitors are already on Digs and Gigs.</strong> They're seeing the same leads you should be seeing. They're winning jobs that could be yours.
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="color: #1a1a1a; font-size: 16px; margin: 0 0 15px 0;"><strong>Here's what you're leaving on the table:</strong></p>
                <ul style="color: #4a4a4a; padding-left: 20px; margin: 0;">
                  <li style="margin-bottom: 10px;">Local homeowners actively looking for contractors</li>
                  <li style="margin-bottom: 10px;">Projects with real budgets (not "just getting quotes")</li>
                  <li style="margin-bottom: 10px;">The ability to build your reputation with verified reviews</li>
                  <li style="margin-bottom: 10px;">A steady stream of work without expensive ads</li>
                </ul>
              </div>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Creating a profile takes 5 minutes. It's free. And you can start seeing leads immediately.
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                If you're serious about growing your business, this is worth 5 minutes of your time.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">Create My Free Profile</a>
              </div>
              
              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                I won't email you again. Best of luck with your business.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | Where pros find their next project
              </p>
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                123 Main Street, Suite 100, San Francisco, CA 94105
              </p>
              <p style="margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #888888; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    }
  };

  return templates[step as keyof typeof templates] || templates[1];
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, email, firstName, step }: ColdEmailRequest = await req.json();

    if (!email || !step) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and step" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = getEmailTemplate(firstName || 'there', step, leadId);

    console.log(`Sending cold email step ${step} to ${email}`);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Digs and Gigs <hello@digsandgigs.com>",
      to: [email],
      subject: template.subject,
      html: template.html,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw emailError;
    }

    // Log to marketing_email_log
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabase.from("marketing_email_log").insert({
      email,
      email_type: `cold_digger_step_${step}`,
      subject: template.subject,
      sent_at: new Date().toISOString(),
    });

    console.log(`Cold email step ${step} sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id, step }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-cold-email-digger:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
