import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCanonicalDiggerProfilePath } from "@/lib/profileUrls";
import { Loader2 } from "lucide-react";

export default function ProfileWorkspaceRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [message, setMessage] = useState("Opening your profile workspace...");

  useEffect(() => {
    const redirect = async () => {
      if (!user) {
        navigate("/register", { replace: true });
        return;
      }

      const mode = searchParams.get("mode");
      const requestedProfileId = searchParams.get("profileId");
      const requestedEditId = searchParams.get("edit");

      const targetProfileId = requestedProfileId || requestedEditId || null;

      let query = supabase
        .from("digger_profiles")
        .select("id, handle, user_id")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (targetProfileId) {
        query = query.eq("id", targetProfileId);
      } else {
        query = query.limit(1);
      }

      const { data: profiles } = await query;
      const profile = profiles?.[0];

      if (!profile) {
        setMessage("Taking you to create your first Digger profile...");
        navigate("/create-first-profile", { replace: true });
        return;
      }

      const next = new URLSearchParams();
      next.set("manage", "1");
      if (mode === "create") {
        next.set("mode", "create");
      } else if (mode === "edit" || targetProfileId) {
        next.set("mode", "edit");
        next.set("profileId", targetProfileId || profile.id);
      }

      const targetPath =
        getCanonicalDiggerProfilePath({
          handle: profile.handle,
          diggerId: profile.id,
        }) || `/digger/${profile.id}`;

      navigate(`${targetPath}?${next.toString()}`, { replace: true });
    };

    void redirect();
  }, [navigate, searchParams, user]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
