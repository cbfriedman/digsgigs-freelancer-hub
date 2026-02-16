import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Briefcase, ArrowRight, MapPin, Star, Clock3 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { getCanonicalDiggerProfilePath, normalizeHandle } from "@/lib/profileUrls";

type RoleView = "overview" | "digger" | "gigger";

interface ResolveRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  canonical_handle: string;
  has_digger: boolean;
  has_gigger: boolean;
  digger_profile_id: string | null;
  digger_handle: string | null;
  gigger_handle: string | null;
}

interface PublicProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  about_me: string | null;
  handle?: string | null;
  gigger_public?: boolean | null;
}

interface DiggerCardData {
  id: string;
  handle: string | null;
  business_name: string | null;
  profession: string | null;
  tagline: string | null;
  bio: string | null;
  location: string | null;
  availability: string | null;
  years_experience: number | null;
  skills: string[] | null;
  profile_image_url: string | null;
  average_rating: number | null;
  total_ratings: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  hourly_rate: number | null;
  is_public?: boolean | null;
}

interface GiggerGigData {
  id: string;
  title: string | null;
  status: string | null;
  budget_min: number | null;
  budget_max: number | null;
  location: string | null;
  created_at: string;
}

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default function ProfileByHandle() {
  const { handle = "", role } = useParams<{ handle: string; role?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<ResolveRow | null>(null);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [digger, setDigger] = useState<DiggerCardData | null>(null);
  const [recentGigs, setRecentGigs] = useState<GiggerGigData[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const safeRole = useMemo<RoleView>(() => {
    if (role === "digger" || role === "gigger") return role;
    return "overview";
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let row: ResolveRow | null = null;

        if (isUuid(handle)) {
          const { data: byId } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, about_me, handle")
            .eq("id", handle)
            .maybeSingle();
          if (byId) {
            const p = byId as PublicProfileData;
            const normalizedHandle = normalizeHandle((p as any).handle);
            if (normalizedHandle && normalizedHandle !== handle.toLowerCase()) {
              const target = `/profile/${normalizedHandle}${safeRole === "overview" ? "" : `/${safeRole}`}`;
              navigate(target, { replace: true });
              return;
            }
            row = {
              user_id: p.id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              canonical_handle: normalizedHandle || p.id,
              has_digger: false,
              has_gigger: true,
              digger_profile_id: null,
              digger_handle: null,
              gigger_handle: normalizedHandle || null,
            };
          }
        } else {
          const { data } = await supabase.rpc("resolve_profile_handle" as any, {
            _handle: handle.toLowerCase(),
          });
          row = ((data as ResolveRow[] | null) || [])[0] || null;
        }

        if (!row) {
          if (!cancelled) {
            setResolved(null);
            setProfile(null);
            setDigger(null);
            setRecentGigs([]);
          }
          return;
        }

        const [{ data: sessionData }, { data: pData }, { data: dData }, { data: gData }] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url, about_me, handle, gigger_public")
            .eq("id", row.user_id)
            .maybeSingle(),
          row.has_digger
            ? supabase
                .from("digger_profiles")
                .select("id, handle, business_name, profession, tagline, bio, location, availability, years_experience, skills, profile_image_url, average_rating, total_ratings, hourly_rate_min, hourly_rate_max, hourly_rate, is_public")
                .eq("user_id", row.user_id)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null } as any),
          row.has_gigger
            ? supabase
                .from("gigs")
                .select("id, title, status, budget_min, budget_max, location, created_at")
                .eq("consumer_id", row.user_id)
                .order("created_at", { ascending: false })
                .limit(6)
            : Promise.resolve({ data: [] } as any),
        ]);

        if (!cancelled) {
          setIsOwner(sessionData.session?.user?.id === row.user_id);
          setResolved(row);
          setProfile((pData as PublicProfileData) || null);
          setDigger((dData as DiggerCardData) || null);
          setRecentGigs((gData as GiggerGigData[]) || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [handle, navigate, safeRole]);

  const canonicalHandle = resolved?.canonical_handle || handle;
  const displayName = profile?.full_name || resolved?.full_name || "User";
  const DEFAULT_AVATAR = "/default-avatar.svg";
  const avatar = digger?.profile_image_url || profile?.avatar_url || resolved?.avatar_url || DEFAULT_AVATAR;
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const formatBudget = (min?: number | null, max?: number | null) => {
    if (min != null && max != null) return `$${Math.round(min).toLocaleString()} - $${Math.round(max).toLocaleString()}`;
    if (min != null) return `From $${Math.round(min).toLocaleString()}`;
    if (max != null) return `Up to $${Math.round(max).toLocaleString()}`;
    return "Budget not listed";
  };
  const openGigCount = recentGigs.filter((g) => g.status === "open").length;
  const closedGigCount = recentGigs.filter((g) => g.status && g.status !== "open").length;
  const canShowDiggerRole = isOwner ? resolved?.has_digger : !!(resolved?.has_digger && (digger?.is_public || safeRole === "digger"));
  const canShowGiggerRole = isOwner ? resolved?.has_gigger : !!(resolved?.has_gigger && profile?.gigger_public);

  useEffect(() => {
    if (!resolved || loading) return;
    if (safeRole === "digger" && !canShowDiggerRole) {
      navigate(`/profile/${canonicalHandle}`, { replace: true });
      return;
    }
    if (safeRole === "gigger" && !canShowGiggerRole) {
      navigate(`/profile/${canonicalHandle}`, { replace: true });
    }
  }, [resolved, loading, safeRole, canShowDiggerRole, canShowGiggerRole, navigate, canonicalHandle]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!resolved || !profile) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile not found</CardTitle>
            <CardDescription>The requested profile does not exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const showDigger = canShowDiggerRole && (safeRole === "overview" || safeRole === "digger");
  const showGigger = canShowGiggerRole && (safeRole === "overview" || safeRole === "gigger");

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <SEOHead
        title={`${displayName} Profile`}
        description={`View ${displayName}'s profile on digsandgigs.`}
        canonical={`/profile/${canonicalHandle}${safeRole === "overview" ? "" : `/${safeRole}`}`}
        ogType="profile"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-1 ring-border/50">
              <AvatarImage src={avatar} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold truncate">{displayName}</h1>
              <div className="flex items-center gap-2 mt-2">
                {canShowDiggerRole && <Badge variant="secondary">Digger</Badge>}
                {canShowGiggerRole && <Badge variant="outline">Gigger</Badge>}
                <span className="text-sm text-muted-foreground truncate">@{canonicalHandle}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={safeRole === "overview" ? "default" : "outline"} onClick={() => navigate(`/profile/${canonicalHandle}`)}>Overview</Button>
        {canShowDiggerRole && (
          <Button variant={safeRole === "digger" ? "default" : "outline"} onClick={() => navigate(`/profile/${canonicalHandle}/digger`)}>Digger</Button>
        )}
        {canShowGiggerRole && (
          <Button variant={safeRole === "gigger" ? "default" : "outline"} onClick={() => navigate(`/profile/${canonicalHandle}/gigger`)}>Gigger</Button>
        )}
      </div>

      {!canShowDiggerRole && !canShowGiggerRole && !isOwner && !(safeRole === "digger" && resolved?.has_digger) && (
        <Card>
          <CardHeader>
            <CardTitle>Profile not publicly available</CardTitle>
            <CardDescription>
              This user has not published a public role profile yet.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {showDigger && resolved.has_digger && digger && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Digger Profile</CardTitle>
              <CardDescription>{digger.profession || "Professional services"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{digger.tagline || digger.bio || "No digger bio yet."}</p>
              <div className="flex flex-wrap gap-2">
                {digger.location && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {digger.location}
                  </Badge>
                )}
                {digger.years_experience != null && (
                  <Badge variant="outline">{digger.years_experience}+ years exp</Badge>
                )}
                {digger.availability && (
                  <Badge variant="secondary" className="capitalize">{digger.availability}</Badge>
                )}
              </div>
              <div className="text-sm flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium">{(digger.average_rating || 0).toFixed(1)}</span>
                <span className="text-muted-foreground">({digger.total_ratings || 0} ratings)</span>
              </div>
              <div className="text-sm">
                {digger.hourly_rate != null
                  ? `Hourly rate: $${Math.round(digger.hourly_rate)}`
                  : digger.hourly_rate_min != null || digger.hourly_rate_max != null
                    ? `Rate range: $${Math.round(digger.hourly_rate_min || 0)} - $${Math.round(digger.hourly_rate_max || 0)}`
                    : "Rate not specified"}
              </div>
              {!!digger.skills?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {digger.skills.slice(0, 8).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => navigate(`/digger/${digger.id}`)}
              >
                Open Full Digger Profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {showGigger && resolved.has_gigger && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Gigger Profile</CardTitle>
              <CardDescription>Client / project owner profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {profile.about_me?.trim() || "No public gigger bio yet."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Recent gigs: {recentGigs.length}</Badge>
                <Badge variant="outline">Open: {openGigCount}</Badge>
                <Badge variant="outline">Other: {closedGigCount}</Badge>
              </div>
              <div className="space-y-2">
                {recentGigs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent gigs posted yet.</p>
                ) : (
                  recentGigs.map((gig) => (
                    <button
                      type="button"
                      key={gig.id}
                      className="w-full rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/gig/${gig.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-sm line-clamp-1">{gig.title || "Untitled gig"}</p>
                        <Badge variant={gig.status === "open" ? "secondary" : "outline"} className="capitalize">
                          {gig.status || "unknown"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatBudget(gig.budget_min, gig.budget_max)}</span>
                        {gig.location && <span className="line-clamp-1">{gig.location}</span>}
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {new Date(gig.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                className="mt-4 w-full sm:w-auto"
                onClick={() => navigate(`/gigger/${resolved.user_id}`)}
              >
                Open Full Gigger Profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
