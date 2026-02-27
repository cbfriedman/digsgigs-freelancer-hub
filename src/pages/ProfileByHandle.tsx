import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Briefcase, ArrowRight, Clock3 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { getCanonicalDiggerProfilePath, getCanonicalGiggerProfilePath, normalizeHandle } from "@/lib/profileUrls";
import { computeDiggerProfileDetailCompletion } from "@/lib/profileCompletion";

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
  digger_skills?: { skills: { name: string } | null }[] | null;
  profile_image_url: string | null;
  average_rating: number | null;
  total_ratings: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  hourly_rate: number | null;
  is_public?: boolean | null;
  pricing_model?: string | null;
  certifications?: string[] | null;
  portfolio_url?: string | null;
  portfolio_urls?: string[] | null;
  website_url?: string | null;
  social_links?: unknown;
  digger_categories?: { categories?: { name?: string } | null }[] | null;
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

interface DiggerBidData {
  id: string;
  gig_id: string;
  status: string;
  created_at: string;
  gigs?: {
    id: string;
    title: string | null;
    status: string | null;
    budget_min: number | null;
    budget_max: number | null;
    location: string | null;
    created_at: string;
  } | null;
}

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export default function ProfileByHandle() {
  const { handle = "", role } = useParams<{ handle: string; role?: string }>();
  const navigate = useNavigate();
  const { userRoles } = useAuth();
  const isAdmin = Array.isArray(userRoles) && userRoles.includes("admin");
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<ResolveRow | null>(null);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [digger, setDigger] = useState<DiggerCardData | null>(null);
  const [recentGigs, setRecentGigs] = useState<GiggerGigData[]>([]);
  const [gigsToShow, setGigsToShow] = useState(4);
  const [recentBids, setRecentBids] = useState<DiggerBidData[]>([]);
  const [bidsToShow, setBidsToShow] = useState(4);
  const [isOwner, setIsOwner] = useState(false);
  const [diggerPortfolioCount, setDiggerPortfolioCount] = useState(0);
  const [diggerExperienceCount, setDiggerExperienceCount] = useState(0);

  const safeRole = useMemo<RoleView>(() => {
    if (role === "digger" || role === "gigger") return role;
    return "overview";
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Resolve handle and session in parallel to reduce wait
        const resolvePromise = isUuid(handle)
          ? supabase
              .from("profiles")
              .select("id, full_name, avatar_url, about_me, handle")
              .eq("id", handle)
              .maybeSingle()
          : supabase.rpc("resolve_profile_handle" as any, { _handle: handle.toLowerCase() });

        const [resolveResult, sessionResult] = await Promise.all([
          resolvePromise,
          supabase.auth.getSession(),
        ]);

        let row: ResolveRow | null = null;
        if (isUuid(handle)) {
          const byId = (resolveResult as { data: unknown }).data;
          if (byId) {
            const p = byId as unknown as PublicProfileData & { handle?: string };
            const normalizedHandle = normalizeHandle(p.handle);
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
          const data = (resolveResult as { data: ResolveRow[] | null }).data;
          row = (data || [])[0] || null;
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

        const sessionData = sessionResult.data;

        const [{ data: pData }, { data: dData }, { data: gData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url, about_me, handle, gigger_public")
            .eq("id", row.user_id)
            .maybeSingle(),
          row.has_digger
            ? supabase
                .from("digger_profiles")
                .select("id, handle, business_name, profession, tagline, bio, location, availability, years_experience, skills, profile_image_url, average_rating, total_ratings, hourly_rate_min, hourly_rate_max, hourly_rate, is_public, pricing_model, certifications, portfolio_url, portfolio_urls, website_url, social_links, digger_skills (skills (name)), digger_categories (categories (name))")
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
          const owner = sessionData.session?.user?.id === row.user_id;
          setIsOwner(owner);
          setResolved(row);
          setProfile((pData as unknown as PublicProfileData) || null);
          const diggerData = dData as DiggerCardData | null;
          setDigger(diggerData || null);
          setRecentGigs((gData as GiggerGigData[]) || []);
          if (diggerData?.id) {
            supabase
              .from("bids")
              .select(`
                id,
                gig_id,
                status,
                created_at,
                gigs!gig_id (
                  id,
                  title,
                  status,
                  budget_min,
                  budget_max,
                  location,
                  created_at
                )
              `)
              .eq("digger_id", diggerData.id)
              .order("created_at", { ascending: false })
              .limit(50)
              .then(({ data: bidData }) => {
                if (!cancelled) {
                  const bids = (bidData || []).map((b: any) => ({
                    ...b,
                    gigs: b.gigs ?? (b.gig_id ? { id: b.gig_id, title: null, status: null, budget_min: null, budget_max: null, location: null, created_at: "" } : null),
                  })) as DiggerBidData[];
                  setRecentBids(bids);
                  setBidsToShow(4);
                }
              })
              .catch(() => { setRecentBids([]); setBidsToShow(4); });
          } else {
            setRecentBids([]);
            setBidsToShow(4);
          }
          if (owner && diggerData?.id) {
            Promise.all([
              (supabase.from("digger_portfolio_items" as any)).select("id", { count: "exact", head: true }).eq("digger_profile_id", diggerData.id),
              (supabase.from("digger_experience" as any)).select("id", { count: "exact", head: true }).eq("digger_profile_id", diggerData.id),
            ]).then(([pRes, eRes]) => {
              if (!cancelled) {
                setDiggerPortfolioCount(pRes.count ?? 0);
                setDiggerExperienceCount(eRes.count ?? 0);
              }
            }).catch(() => {});
          } else {
            setDiggerPortfolioCount(0);
            setDiggerExperienceCount(0);
          }
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
  const pendingBidCount = recentBids.filter((b) => b.status === "pending").length;
  const awardedBidCount = recentBids.filter((b) => b.status === "accepted").length;
  const canShowDiggerRole = isOwner || isAdmin ? !!resolved?.has_digger : !!(resolved?.has_digger && (digger?.is_public || safeRole === "digger"));
  const canShowGiggerRole = isOwner || isAdmin ? !!resolved?.has_gigger : !!(resolved?.has_gigger && profile?.gigger_public);

  const profileCompletion = useMemo(() => {
    if (!isOwner || !digger) return null;
    return computeDiggerProfileDetailCompletion({
      ...digger,
      profiles: profile ? { avatar_url: profile.avatar_url } : null,
      portfolio_item_count: diggerPortfolioCount,
      experience_count: diggerExperienceCount,
    });
  }, [isOwner, digger, profile?.avatar_url, diggerPortfolioCount, diggerExperienceCount]);

  useEffect(() => {
    if (!resolved || loading) return;
    if (safeRole === "digger" && !canShowDiggerRole) {
      navigate(`/profile/${canonicalHandle}`, { replace: true });
      return;
    }
    if (safeRole === "gigger" && !canShowGiggerRole) {
      navigate(`/profile/${canonicalHandle}`, { replace: true });
      return;
    }
    // Visitors to /profile/:handle/digger see the full Digger profile page (same as /digger/:id)
    if (safeRole === "digger" && canShowDiggerRole && digger?.id) {
      navigate(`/digger/${digger.id}`, { replace: true });
    }
  }, [resolved, loading, safeRole, canShowDiggerRole, canShowGiggerRole, navigate, canonicalHandle, digger?.id]);

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
          <div className="flex items-center gap-4 flex-wrap">
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
            {isOwner && profileCompletion && digger?.id && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-auto rounded-lg border bg-muted/30 px-3 py-2 text-sm font-normal hover:bg-muted/50"
                onClick={() => navigate(`/digger/${digger.id}`)}
              >
                <span className="font-medium text-muted-foreground">Profile completion</span>
                <span className="font-semibold tabular-nums text-foreground ml-2">{profileCompletion.score}%</span>
                <ArrowRight className="h-3.5 w-3.5 ml-2 text-muted-foreground shrink-0" />
              </Button>
            )}
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
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Digger Profile</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-orange-500 bg-orange-500 text-white hover:bg-orange-600 hover:text-white hover:border-orange-600"
                onClick={() => navigate(`/digger/${digger.id}`)}
              >
                Open Full Digger Profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Recent bids: {recentBids.length}</Badge>
                <Badge variant="outline">Pending: {pendingBidCount}</Badge>
                <Badge variant="outline">Awarded: {awardedBidCount}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {digger.years_experience != null && (
                  <Badge variant="outline">{digger.years_experience}+ years exp</Badge>
                )}
              </div>
              <div className="space-y-2">
                {recentBids.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent bids yet.</p>
                ) : (
                  recentBids.slice(0, bidsToShow).map((bid) => {
                    const gig = bid.gigs;
                    const title = gig?.title || "Project";
                    return (
                      <button
                        type="button"
                        key={bid.id}
                        className="w-full rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/gig/${bid.gig_id}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-sm line-clamp-1">{title}</p>
                          <Badge variant={bid.status === "accepted" ? "secondary" : "outline"} className="capitalize shrink-0">
                            {bid.status}
                          </Badge>
                        </div>
                        {gig && (gig.budget_min != null || gig.budget_max != null) && (
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{formatBudget(gig.budget_min, gig.budget_max)}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {bid.created_at ? new Date(bid.created_at).toLocaleDateString() : ""}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
                {recentBids.length > bidsToShow && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground"
                    onClick={() => setBidsToShow((prev) => Math.min(prev + 4, recentBids.length))}
                  >
                    Load more ({recentBids.length - bidsToShow} more)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {showGigger && resolved.has_gigger && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Gigger Profile</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-orange-500 bg-orange-500 text-white hover:bg-orange-600 hover:text-white hover:border-orange-600"
                onClick={() => navigate(getCanonicalGiggerProfilePath(resolved.user_id))}
              >
                Open Full Gigger Profile
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Recent gigs: {recentGigs.length}</Badge>
                <Badge variant="outline">Open: {openGigCount}</Badge>
                <Badge variant="outline">Other: {closedGigCount}</Badge>
              </div>
              <div className="space-y-2">
                {recentGigs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent gigs posted yet.</p>
                ) : (
                  recentGigs.slice(0, gigsToShow).map((gig) => (
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
                {recentGigs.length > gigsToShow && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground"
                    onClick={() => setGigsToShow((prev) => Math.min(prev + 4, recentGigs.length))}
                  >
                    Load more ({recentGigs.length - gigsToShow} more)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
