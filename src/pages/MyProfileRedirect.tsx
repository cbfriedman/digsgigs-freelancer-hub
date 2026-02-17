import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { goToProfileWorkspace } from "@/lib/profileWorkspaceRoute";
import { getCanonicalDiggerProfilePath, getCanonicalGiggerProfilePath } from "@/lib/profileUrls";
import { Loader2 } from "lucide-react";

/**
 * Redirects to the current user's profile detail page.
 * - ?view=gigger → /gigger/:userId (Gigger profile)
 * - ?view=digger → /profile/:handle/digger or /digger/:id (Digger profile, canonical when handle exists)
 * - No query: use active role (Gigger → /gigger/:userId, Digger → canonical digger URL)
 * - No profile yet → /my-profiles (workspace)
 */
export default function MyProfileRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, activeRole, userRoles } = useAuth();
  const view = searchParams.get("view"); // "digger" | "gigger" to force which profile

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      navigate("/register", { replace: true });
      return;
    }

    const go = async () => {
      // Explicit view: owner can open either profile
      if (view === "gigger") {
        navigate(getCanonicalGiggerProfilePath(user.id), { replace: true });
        return;
      }
      if (view === "digger" && userRoles.includes("digger")) {
        const { data, error } = await supabase
          .from("digger_profiles")
          .select("id, handle")
          .eq("user_id", user.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!error && data?.id) {
          const path = getCanonicalDiggerProfilePath({ handle: data.handle, diggerId: data.id });
          navigate(path ?? `/digger/${data.id}`, { replace: true });
          return;
        }
      }

      // No view or invalid view: use active role
      if (activeRole === "gigger") {
        navigate(getCanonicalGiggerProfilePath(user.id), { replace: true });
        return;
      }

      if (activeRole === "digger" && userRoles.includes("digger")) {
        const { data, error } = await supabase
          .from("digger_profiles")
          .select("id, handle")
          .eq("user_id", user.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!error && data?.id) {
          const path = getCanonicalDiggerProfilePath({ handle: data.handle, diggerId: data.id });
          navigate(path ?? `/digger/${data.id}`, { replace: true });
          return;
        }
      }

      goToProfileWorkspace(navigate, {}, { replace: true });
    };

    void go();
  }, [authLoading, user?.id, activeRole, userRoles, view, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
