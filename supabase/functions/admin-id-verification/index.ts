import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@3.0.0";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

const APP_NAME = "Digs and Gigs";
const FROM_EMAIL = "Digs and Gigs <noreply@digsandgigs.net>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendApprovalEmail(toEmail: string, displayName: string): Promise<{ sent: boolean; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("[admin-id-verification] RESEND_API_KEY is not set. Set it in Supabase Dashboard → Edge Functions → Secrets.");
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `${APP_NAME} – Your ID verification has been approved`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">ID verification approved</h1>
          </div>
          <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <p>Hi ${escapeHtml(displayName)},</p>
            <p>Good news – your ID verification has been <strong>approved</strong> by our team.</p>
            <p>Your profile now shows you as verified, and your name and address on file have been updated to match your submitted ID.</p>
            <p>You can view your account and verification status anytime in <strong>Account settings</strong>.</p>
            <p>If you have any questions, reply to this email or contact support.</p>
            <hr style="border: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
          </div>
        </div>
      `,
    });
    if (error) {
      console.error("[admin-id-verification] Resend error:", error.message || error);
      return { sent: false, error: error.message || String(error) };
    }
    console.log("[admin-id-verification] Approval email sent to", toEmail, "id:", data?.id);
    return { sent: true };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[admin-id-verification] Resend exception:", errMsg);
    return { sent: false, error: errMsg };
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, function: "admin-id-verification" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(token);
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRoles } = await supabaseAdmin
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", adminUser.id)
      .eq("app_role", "admin")
      .eq("is_active", true);

    if (!adminRoles?.length) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      submissionId?: string;
      action?: string;
      rejection_reason?: string;
    };

    const { submissionId, action, rejection_reason } = body;
    if (!submissionId || !action) {
      return new Response(
        JSON.stringify({ error: "submissionId and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: submission, error: subError } = await supabaseAdmin
      .from("id_verification_submissions")
      .select("id, user_id, status, legal_name, street_address, apt, city, state, zip, country")
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (submission.status !== "pending_review") {
      return new Response(
        JSON.stringify({ error: "Submission is not pending review" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    if (action === "reject") {
      const { error: updateError } = await supabaseAdmin
        .from("id_verification_submissions")
        .update({
          status: "rejected",
          reviewed_by: adminUser.id,
          reviewed_at: now,
          rejection_reason: rejection_reason?.trim() || null,
        })
        .eq("id", submissionId);

      if (updateError) {
        console.error("Reject update error:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "approve") {
      const parts = (submission.legal_name ?? "").trim().split(/\s+/);
      const first_name = parts[0] ?? null;
      const last_name = parts.length > 1 ? parts.slice(1).join(" ") : null;
      const address = [submission.street_address, submission.apt].filter(Boolean).join(", ");

      const { error: updateSubError } = await supabaseAdmin
        .from("id_verification_submissions")
        .update({
          status: "approved",
          reviewed_by: adminUser.id,
          reviewed_at: now,
          rejection_reason: null,
        })
        .eq("id", submissionId);

      if (updateSubError) {
        console.error("Approve submission update error:", updateSubError);
        return new Response(
          JSON.stringify({ error: updateSubError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          first_name,
          last_name,
          address: address || null,
          city: submission.city ?? null,
          state: submission.state ?? null,
          zip_postal: submission.zip ?? null,
          country: submission.country ?? null,
          id_verified: true,
        })
        .eq("id", submission.user_id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        return new Response(
          JSON.stringify({ error: profileError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.rpc("sync_profile_handle_from_name", { p_user_id: submission.user_id });

      const locationText = [submission.city, submission.state, submission.country].filter(Boolean).join(", ") || null;
      const { data: diggerRows } = await supabaseAdmin
        .from("digger_profiles")
        .select("id")
        .eq("user_id", submission.user_id);

      if (diggerRows?.length) {
        for (const row of diggerRows) {
          await supabaseAdmin
            .from("digger_profiles")
            .update({
              city: submission.city ?? null,
              state: submission.state ?? null,
              country: submission.country ?? null,
              location: locationText,
            })
            .eq("id", row.id);
        }
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", submission.user_id)
        .single();

      const toEmail = profile?.email?.trim();
      const displayName = profile?.full_name || submission.legal_name || "there";

      if (toEmail) {
        const emailResult = await sendApprovalEmail(toEmail, displayName);
        if (!emailResult.sent) {
          console.warn("[admin-id-verification] Approval succeeded but email not sent:", emailResult.error);
        }
      } else {
        console.warn("[admin-id-verification] No email in profiles for user", submission.user_id, "- cannot send confirmation. Ensure profiles.email is set (e.g. from auth).");
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'approve' or 'reject'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-id-verification error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
