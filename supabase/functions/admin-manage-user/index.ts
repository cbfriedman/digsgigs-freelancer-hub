import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Verify admin access via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role via user_app_roles
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body?.action as string | undefined;
    const userId = (body?.userId ?? body?.user_id) as string | undefined;
    const confirmFullUserDeletion = body?.confirmFullUserDeletion;

    if (!userId || typeof userId !== "string") {
      const bodyKeys = typeof body === "object" && body !== null ? Object.keys(body) : [];
      return new Response(
        JSON.stringify({
          error: "userId is required",
          debug: bodyKeys.length ? `body keys: ${bodyKeys.join(", ")}` : "body empty or invalid",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent admin from suspending/deleting themselves
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot perform this action on your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "suspend": {
        // Ban user - ban_duration format: "876000h" = 100 years (effectively permanent)
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
        });

        if (error) {
          console.error("Suspend error:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profiles.is_suspended for UI display
        await supabaseAdmin.from("profiles").update({ is_suspended: true }).eq("id", userId);

        return new Response(
          JSON.stringify({ success: true, message: "User suspended successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unsuspend": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });

        if (error) {
          console.error("Unsuspend error:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update profiles.is_suspended for UI display
        await supabaseAdmin.from("profiles").update({ is_suspended: false }).eq("id", userId);

        return new Response(
          JSON.stringify({ success: true, message: "User unsuspended successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const confirmed = confirmFullUserDeletion === true || confirmFullUserDeletion === "true";
        if (!confirmed) {
          return new Response(
            JSON.stringify({ error: "Full user deletion requires explicit confirmation. Pass confirmFullUserDeletion: true." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Clear storage.objects ownership and nullable FKs so auth delete can succeed
        const { error: cleanupError } = await supabaseAdmin.rpc("admin_clear_user_references", {
          target_user_id: userId,
        });
        if (cleanupError) {
          console.error("Pre-delete cleanup error:", cleanupError);
          return new Response(
            JSON.stringify({ error: `Cleanup failed: ${cleanupError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
          console.error("Delete error:", error);
          const message = error.message || "Failed to delete user";
          const payload: Record<string, unknown> = { error: message };
          // On DB constraint errors, run diagnostic so the client can show which tables still reference the user
          if (message.includes("Database error deleting user")) {
            payload.blocking_tables = [];
            try {
              const { data: refs, error: rpcErr } = await supabaseAdmin.rpc("admin_list_remaining_user_references", {
                target_user_id: userId,
              });
              if (rpcErr) {
                console.error("admin_list_remaining_user_references RPC error:", rpcErr);
                payload.debug = `Diagnostic failed: ${rpcErr.message}. Run: supabase db push, then supabase functions deploy admin-manage-user.`;
              } else if (refs && Array.isArray(refs) && refs.length > 0) {
                payload.blocking_tables = refs;
                payload.debug =
                  "Blocking: " +
                  (refs as { schema_name: string; table_name: string; row_count: number }[])
                    .map((r) => `${r.schema_name}.${r.table_name} (${r.row_count})`)
                    .join(", ");
              } else {
                payload.debug =
                  "No refs found. Run: supabase db push (apply 20260313100000), then supabase functions deploy admin-manage-user. If it still fails, check Dashboard > Edge Functions > Logs.";
              }
            } catch (e) {
              console.error("Diagnostic RPC failed:", e);
              payload.debug =
                "Run: supabase db push, then supabase functions deploy admin-manage-user. If it still fails, check Dashboard > Edge Functions > Logs.";
            }
          }
          return new Response(
            JSON.stringify(payload),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: "User deleted successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_profile": {
        // Keep auth account and core profile row intact; only remove role-specific profile records.
        const { error: diggerDeleteError } = await supabaseAdmin
          .from("digger_profiles")
          .delete()
          .eq("user_id", userId);

        if (diggerDeleteError) {
          console.error("Delete digger_profiles error:", diggerDeleteError);
          return new Response(
            JSON.stringify({ error: diggerDeleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: giggerDeleteError } = await supabaseAdmin
          .from("gigger_profiles")
          .delete()
          .eq("user_id", userId);

        if (giggerDeleteError) {
          console.error("Delete gigger_profiles error:", giggerDeleteError);
          return new Response(
            JSON.stringify({ error: giggerDeleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: telemarketerDeleteError } = await supabaseAdmin
          .from("telemarketer_profiles")
          .delete()
          .eq("user_id", userId);

        if (telemarketerDeleteError) {
          console.error("Delete telemarketer_profiles error:", telemarketerDeleteError);
          return new Response(
            JSON.stringify({ error: telemarketerDeleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: roleDeleteError } = await supabaseAdmin
          .from("user_app_roles")
          .delete()
          .eq("user_id", userId)
          .in("app_role", ["digger", "gigger", "telemarketer"]);

        if (roleDeleteError) {
          console.error("Delete user_app_roles error:", roleDeleteError);
          return new Response(
            JSON.stringify({ error: roleDeleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: profileUpdateError } = await supabaseAdmin
          .from("profiles")
          .update({ user_type: "consumer" })
          .eq("id", userId);

        if (profileUpdateError) {
          console.error("Update profile user_type error:", profileUpdateError);
          return new Response(
            JSON.stringify({ error: profileUpdateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: "Role-specific profile data deleted successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use 'suspend', 'unsuspend', 'delete_profile', or 'delete'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("admin-manage-user error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
