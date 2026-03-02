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
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRoles } = await supabaseAdmin
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", user.id)
      .eq("app_role", "admin")
      .eq("is_active", true);

    if (!adminRoles?.length) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { requestId, action, rejection_reason } = body;

    if (!requestId || !action) {
      return new Response(
        JSON.stringify({ error: "requestId and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: requestRow, error: fetchError } = await supabaseAdmin
      .from("profile_identity_update_requests")
      .select("id, user_id, status, first_name, last_name, address, city, state_region, zip_postal, country")
      .eq("id", requestId)
      .single();

    if (fetchError || !requestRow) {
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requestRow.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Request is no longer pending" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = requestRow.user_id;

    if (action === "reject") {
      const { error: updateError } = await supabaseAdmin
        .from("profile_identity_update_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: rejection_reason?.trim() || null,
        })
        .eq("id", requestId);

      if (updateError) {
        console.error("approve-profile-identity-request reject error:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Request rejected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "approve") {
      const updates: Record<string, unknown> = {};
      if (requestRow.first_name != null) updates.first_name = requestRow.first_name;
      if (requestRow.last_name != null) updates.last_name = requestRow.last_name;
      if (requestRow.address != null) updates.address = requestRow.address;
      if (requestRow.city != null) updates.city = requestRow.city;
      if (requestRow.state_region != null) updates.state = requestRow.state_region;
      if (requestRow.zip_postal != null) updates.zip_postal = requestRow.zip_postal;
      if (requestRow.country != null) updates.country = requestRow.country;

      if (Object.keys(updates).length > 0) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update(updates)
          .eq("id", userId);

        if (profileError) {
          console.error("approve-profile-identity-request profile update error:", profileError);
          return new Response(
            JSON.stringify({ error: profileError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Sync full_name and handle from first_name/last_name so profile URL matches new name
        const { error: rpcError } = await supabaseAdmin.rpc("sync_profile_handle_from_name", {
          p_user_id: userId,
        });

        if (rpcError) {
          console.error("approve-profile-identity-request sync handle error:", rpcError);
          // Don't fail the whole approve; name/address were saved
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("profile_identity_update_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: null,
        })
        .eq("id", requestId);

      if (updateError) {
        console.error("approve-profile-identity-request status update error:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Request approved; profile and handle updated." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("approve-profile-identity-request error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
