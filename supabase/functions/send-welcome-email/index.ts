import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE_URL = "https://digsandgigs.net";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface WelcomeEmailRequest {
  userId?: string;
  email?: string;
  name?: string;
  role: "digger" | "gigger";
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

function addUTM(
  url: string,
  source = "email",
  medium = "welcome",
  campaign = "onboarding"
): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}`;
}

function buildDiggerWelcomeHtml(firstName: string, email: string): string {
  const dashboardUrl = addUTM(`${BASE_URL}/role-dashboard`, "email", "welcome", "dashboard");
  const profileUrl = addUTM(`${BASE_URL}/my-profiles`, "email", "welcome", "complete_profile");
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%); color: #fff; padding: 48px 32px; text-align: center;">
    <p style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.95;">Welcome, Professional</p>
    <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700;">${firstName}, you're in.</h1>
    <p style="margin: 0; font-size: 17px; opacity: 0.95;">Project leads are on the way. Here's how to win them.</p>
  </div>
  <div style="padding: 36px 32px; background: #ffffff;">
    <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
    <p style="font-size: 16px; margin: 0 0 24px 0;">You signed up as a <strong>Digger</strong> — a pro who finds work through Digs & Gigs. We match you with clients who need your skills and send project details straight to your inbox. You choose which leads to unlock (from $10) and keep 100% of what you earn.</p>
    <div style="background: #f0fdfa; border-left: 4px solid #0d9488; padding: 20px 24px; margin: 28px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f766e;">What you get</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #334155;">
        <li style="margin-bottom: 6px;">Leads delivered by email — no bidding wars</li>
        <li style="margin-bottom: 6px;">Pay per lead (from $10); full refund if a lead is invalid</li>
        <li style="margin-bottom: 6px;">No commission on your earnings</li>
        <li>Complete your profile so clients can find you too</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #0d9488; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 17px;">Go to your dashboard →</a>
    </div>
    <p style="font-size: 15px; color: #64748b; margin: 24px 0 0 0;">Next step: complete your profile so we can match you with the right projects.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${profileUrl}" style="display: inline-block; background: #1e293b; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Complete your profile</a>
    </div>
    <p style="font-size: 14px; color: #64748b; margin: 28px 0 0 0;">We'll send you tips to win more projects over the next few days. Reply anytime if you have questions.</p>
  </div>
  <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">Digs & Gigs — Find work. Get paid.</p>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
      <a href="${BASE_URL}" style="color: #0d9488; text-decoration: none;">Website</a> ·
      <a href="${BASE_URL}/faq" style="color: #0d9488; text-decoration: none;">FAQ</a> ·
      <a href="${unsubscribeUrl}" style="color: #0d9488; text-decoration: none;">Unsubscribe from these emails</a>
    </p>
    <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">© ${new Date().getFullYear()} Digs & Gigs. All rights reserved.</p>
  </div>
</body>
</html>`;
}

function buildGiggerWelcomeHtml(firstName: string, email: string): string {
  const postGigUrl = addUTM(`${BASE_URL}/post-gig`, "email", "welcome", "first_project");
  const howItWorksUrl = addUTM(`${BASE_URL}/how-it-works`, "email", "welcome", "learn_more");
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%); color: #fff; padding: 48px 32px; text-align: center;">
    <p style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.95;">Welcome, Project Owner</p>
    <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700;">${firstName}, let's get your project done.</h1>
    <p style="margin: 0; font-size: 17px; opacity: 0.95;">Post your gig. Get quotes from verified pros. Hire with confidence.</p>
  </div>
  <div style="padding: 36px 32px; background: #ffffff;">
    <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
    <p style="font-size: 16px; margin: 0 0 24px 0;">You signed up as a <strong>Gigger</strong> — someone who posts projects and hires pros on Digs & Gigs. Describe what you need once; we'll match you with qualified professionals who send quotes. You compare, choose, and hire. No obligation until you're ready.</p>
    <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 20px 24px; margin: 28px 0; border-radius: 0 8px 8px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #5b21b6;">How it works</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #334155;">
        <li style="margin-bottom: 6px;">Post your project (title, description, budget) — takes about 2 minutes</li>
        <li style="margin-bottom: 6px;">Verified pros in your area see it and send you quotes</li>
        <li style="margin-bottom: 6px;">Compare quotes and reviews, then hire the best fit</li>
        <li>Pay and communicate through the platform for peace of mind</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${postGigUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 17px;">Post your first project →</a>
    </div>
    <p style="font-size: 15px; color: #64748b; margin: 24px 0 0 0;">Most projects get responses within 24 hours. Need more details first?</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${howItWorksUrl}" style="display: inline-block; background: #1e293b; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">See how it works</a>
    </div>
    <p style="font-size: 14px; color: #64748b; margin: 28px 0 0 0;">Questions? Just reply to this email — we're here to help.</p>
  </div>
  <div style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">Digs & Gigs — Hire pros. Get it done.</p>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
      <a href="${BASE_URL}" style="color: #7c3aed; text-decoration: none;">Website</a> ·
      <a href="${BASE_URL}/faq" style="color: #7c3aed; text-decoration: none;">FAQ</a> ·
      <a href="${unsubscribeUrl}" style="color: #7c3aed; text-decoration: none;">Unsubscribe from these emails</a>
    </p>
    <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">© ${new Date().getFullYear()} Digs & Gigs. All rights reserved.</p>
  </div>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured", details: "RESEND_API_KEY is missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    let body: WelcomeEmailRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const role = body.role === "digger" ? "digger" : "gigger";
    let email = typeof body.email === "string" ? body.email.trim() : undefined;
    let name = typeof body.name === "string" ? body.name.trim() : undefined;
    const userId = body.userId;

    if ((!email || !name) && userId) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        if (!email) email = authUser.user.email ?? undefined;
        if (!name) name = (authUser.user.user_metadata?.full_name as string) || (authUser.user.user_metadata?.name as string) ?? undefined;
      }
      if (!email && userId) {
        const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
        if (profile?.full_name && !name) name = profile.full_name;
      }
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailNormalized = email.toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalized)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    const { data: unsubRow } = await supabaseAdmin
      .from("email_unsubscribes")
      .select("email")
      .eq("email", emailNormalized)
      .maybeSingle();

    if (unsubRow) {
      console.log("Skipping welcome email — user unsubscribed:", emailNormalized);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "unsubscribed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstName = name?.split(" ")[0] || "there";
    const subject =
      role === "digger"
        ? `You're in, ${firstName} — project leads are on the way`
        : `Let's get your project done, ${firstName}`;
    const html = role === "digger" ? buildDiggerWelcomeHtml(firstName, emailNormalized) : buildGiggerWelcomeHtml(firstName, emailNormalized);

    console.log("Sending welcome email:", { email: emailNormalized, role, userId: userId ?? null });

    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <hello@digsandgigs.net>",
      to: [emailNormalized],
      subject,
      html,
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: emailResponse.error.message || "Unknown error from Resend API",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Welcome email sent:", { emailId: emailResponse.data?.id, email: emailNormalized, role });

    try {
      await supabaseAdmin.from("marketing_email_log").insert({
        email: emailNormalized,
        email_type: "welcome",
        reason: `welcome_${role}`,
        user_id: userId ?? null,
        campaign_name: body.utmCampaign || "onboarding",
      });
    } catch (logErr) {
      console.error("Failed to log welcome email:", logErr);
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: unknown) {
    console.error("Error in send-welcome-email:", err);
    return new Response(
      JSON.stringify({
        error: (err as Error)?.message ?? "Unknown error",
        details: (err as Error)?.stack ?? "",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
