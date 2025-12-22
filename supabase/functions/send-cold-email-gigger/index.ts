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
  return `${url}${separator}utm_source=cold_email&utm_medium=email&utm_campaign=gigger_sequence&utm_content=day_${step === 1 ? 0 : step === 2 ? 3 : step === 3 ? 7 : 14}`;
};

const getEmailTemplate = (firstName: string, step: number, leadId: string) => {
  const name = firstName || 'there';
  const unsubscribeUrl = `https://digsandgigs.com/unsubscribe-cold?id=${leadId}`;
  const ctaUrl = addUTM('https://digsandgigs.com/post-gig', step);
  
  const templates = {
    1: {
      subject: "Stop overpaying for home projects",
      preheader: "Get 3-5 competitive quotes from verified local pros. Free.",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stop Overpaying for Home Projects</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Hi ${name},</h2>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Did you know most homeowners overpay by <strong>15-30%</strong> on home projects simply because they don't compare quotes?
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Digs and Gigs</strong> connects you with verified local professionals who compete for your business. Whether it's a kitchen remodel, roof repair, or landscaping project — get 3-5 competitive quotes within 48 hours.
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 18px;">Here's how it works:</h3>
                <ul style="color: #4a4a4a; padding-left: 20px; margin: 0;">
                  <li style="margin-bottom: 10px;">📝 Describe your project (takes 2 minutes)</li>
                  <li style="margin-bottom: 10px;">👷 Verified pros submit competitive bids</li>
                  <li style="margin-bottom: 10px;">💰 You choose the best fit for your budget</li>
                </ul>
              </div>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                <strong>100% free. No obligation.</strong> Compare quotes and save thousands on your next project.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">Get Free Quotes Now</a>
              </div>
              
              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Questions? Just reply to this email — we're here to help.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | Connecting homeowners with trusted professionals
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
      subject: '"I saved $2,400 on my kitchen remodel"',
      preheader: "See how Sarah M. found the perfect contractor through Digs and Gigs",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Success Story</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Hi ${name},</h2>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Last week, I told you about how Digs and Gigs helps homeowners save money. Today, I want to share a real story:
              </p>
              
              <div style="background: linear-gradient(135deg, #f8f4ff 0%, #fff 100%); border-left: 4px solid #9b59b6; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <p style="color: #4a4a4a; font-size: 16px; font-style: italic; line-height: 1.6; margin: 0 0 15px 0;">
                  "I was quoted $18,000 for my kitchen remodel by a contractor I found online. On a whim, I posted the same project on Digs and Gigs. Within 2 days, I had 4 quotes — the best one was $15,600 from a 5-star rated contractor."
                </p>
                <p style="color: #1a1a1a; font-weight: 600; margin: 0;">
                  — Sarah M., Austin, TX
                </p>
              </div>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Sarah saved <strong>$2,400</strong> in under 5 minutes of work. And she's not alone — our average user saves 18% compared to their first quote.
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                The best part? <strong>It costs you nothing.</strong> Professionals pay to bid on your project — you just pick the winner.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">Post Your Project Free</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | Connecting homeowners with trusted professionals
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
      subject: "Your neighbors are already using this...",
      preheader: "347 projects posted in your area this month. Here's why.",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Neighbors Are Using This</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">${name}, quick update:</h2>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>347 home projects</strong> were posted in your area this month — from bathroom renovations to fence repairs to full kitchen remodels.
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Smart homeowners are discovering that the old way of finding contractors (Googling, calling around, hoping for the best) is outdated.
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 18px;">Why homeowners choose us:</h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #4a4a4a; font-size: 14px;">✅ <strong>Free</strong> — Never pay to post or receive quotes</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #4a4a4a; font-size: 14px;">✅ <strong>Fast</strong> — Get 3-5 quotes within 48 hours</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #4a4a4a; font-size: 14px;">✅ <strong>Smart</strong> — Pros compete, you get the best price</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Got a project in mind? Even if it's just an idea, post it and see what quotes come in. No commitment required.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">See What Your Project Would Cost</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | Connecting homeowners with trusted professionals
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
      subject: "Last chance: Free quotes waiting",
      preheader: "This is my last email. Here's a 2-minute way to save thousands.",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Last Chance</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Hi ${name},</h2>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This is my last email to you. I don't want to be a bother.
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                But I genuinely believe this: <strong>if you have any home project coming up in the next year, you should at least see what it would cost.</strong>
              </p>
              
              <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff 100%); border: 1px solid #ffd700; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
                <p style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin: 0 0 10px 0;">
                  2 minutes to post. 48 hours to get quotes.
                </p>
                <p style="color: #4a4a4a; font-size: 16px; margin: 0;">
                  Average savings: <strong>$1,800</strong>
                </p>
              </div>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                If nothing else, at least you'll know what your project <em>should</em> cost — so nobody can overcharge you.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">Get My Free Quotes</a>
              </div>
              
              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Thanks for your time. Wishing you the best on your home projects.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | Connecting homeowners with trusted professionals
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
      email_type: `cold_gigger_step_${step}`,
      subject: template.subject,
      sent_at: new Date().toISOString(),
    });

    console.log(`Cold email step ${step} sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id, step }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-cold-email-gigger:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
