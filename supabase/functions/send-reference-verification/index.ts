import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const siteUrl = Deno.env.get("SITE_URL") || "https://www.digsandgigs.net";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const referenceId = body?.reference_id;

    if (!referenceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing reference_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: ref, error: refError } = await supabaseAdmin
      .from("references")
      .select("id, digger_id, reference_name, reference_email")
      .eq("id", referenceId)
      .single();

    if (refError || !ref) {
      return new Response(
        JSON.stringify({ success: false, error: "Reference not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const { data: dp } = await supabaseAdmin
      .from("digger_profiles")
      .select("user_id")
      .eq("id", ref.digger_id)
      .single();

    if (!dp || dp.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Not authorized to send verification for this reference" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const email = (ref.reference_email || "").trim();
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Reference has no email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("reference_verification_tokens")
      .insert({ reference_id: referenceId })
      .select("token")
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create verification link" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const verifyUrl = `${siteUrl}/verify-reference?token=${tokenRow.token}`;

    const { error: emailError } = await resend.emails.send({
      from: "Digs and Gigs <noreply@digsandgigs.net>",
      to: [email],
      subject: "Verify your reference on Digs and Gigs",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .btn { display: inline-block; background: #667eea; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .muted { color: #666; font-size: 14px; margin-top: 24px; }
  </style>
</head>
<body>
  <p>Hi ${(ref.reference_name || "there").split(" ")[0]},</p>
  <p>Someone listed you as a reference on Digs and Gigs. To verify that you worked with them and confirm your recommendation, please click the button below:</p>
  <p><a href="${verifyUrl}" class="btn">Verify this reference</a></p>
  <p class="muted">This link expires in 7 days. If you didn't expect this email, you can ignore it.</p>
  <p class="muted">— Digs and Gigs</p>
</body>
</html>`,
    });

    if (emailError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: "Something went wrong" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
