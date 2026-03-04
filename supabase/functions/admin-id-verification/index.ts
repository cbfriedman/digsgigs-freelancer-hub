import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRoles } = await supabaseAdmin
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", user.id)
      .eq("app_role", "admin")
      .eq("is_active", true);

    if (!adminRoles?.length) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { submissionId, action, rejection_reason } = body;

    if (!submissionId || !action || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "submissionId and action (approve|reject) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from("id_verification_submissions")
      .select("id, user_id, status, legal_name, street_address, apt, city, state, zip, country")
      .eq("id", submissionId)
      .single();

    if (fetchErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (submission.status !== "pending_review") {
      return new Response(JSON.stringify({ error: "Submission is not pending review" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = submission.user_id as string;

    if (action === "reject") {
      const { error: updateErr } = await supabaseAdmin
        .from("id_verification_submissions")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejection_reason?.trim() || null,
        })
        .eq("id", submissionId);

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nameParts = (submission.legal_name || "").trim().split(/\s+/);
    const first_name = nameParts[0] || null;
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
    const city = (submission.city || "").trim();
    const state = (submission.state || "").trim();
    const country = (submission.country || "United States (US)").trim();
    const locationText = [city, state, country].filter(Boolean).join(", ");

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name,
        last_name,
        address: (submission.street_address || "").trim(),
        city,
        state,
        zip_postal: (submission.zip || "").trim(),
        country,
        id_verified: true,
      })
      .eq("id", userId);

    if (profileErr) {
      return new Response(JSON.stringify({ error: `Profile update: ${profileErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: syncErr } = await supabaseAdmin.rpc("sync_profile_handle_from_name", {
      p_user_id: userId,
    });
    if (syncErr) console.error("Sync handle error:", syncErr);

    await supabaseAdmin
      .from("digger_profiles")
      .update({
        city,
        state,
        country,
        location: locationText || null,
      })
      .eq("user_id", userId);

    const { error: updateErr } = await supabaseAdmin
      .from("id_verification_submissions")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-id-verification error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
