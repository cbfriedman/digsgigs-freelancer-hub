import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type PublicProfileData = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  about_me: string | null;
};

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, about_me")
          .eq("id", id)
          .maybeSingle();
        if (!cancelled) setProfile((data as PublicProfileData) || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-2xl py-6 sm:py-8">
        <Card>
          <CardHeader>
            <CardTitle>Public Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This user has not shared a public profile yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = (profile.full_name || "User")
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="container max-w-2xl py-6 sm:py-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Avatar className="h-12 w-12 ring-1 ring-border/50">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || "User"} />
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <CardTitle>{profile.full_name || "User"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
          {profile.about_me?.trim() || "No bio provided."}
        </CardContent>
      </Card>
    </div>
  );
}
