import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Tag, User, Loader2, Award, MessageSquare, RefreshCw, Copy, MapPin, CheckCircle2, FileText, ArrowRight, ChevronDown, ChevronUp, Trash2, Pencil, Mail, Phone, CreditCard, IdCard, Share2, Clock, Search, Filter, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BidSubmissionTemplate } from "@/components/BidSubmissionTemplate";
import { BidsList, defaultBidFilters, BID_SORT_OPTIONS, type BidFilters, type BidStats, type BidSortOption } from "@/components/BidsList";
import { FreeEstimateDiggers } from "@/components/FreeEstimateDiggers";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { generateJobPostingSchema } from "@/components/StructuredData";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useAuth } from "@/contexts/AuthContext";
import { formatSelectionDisplay, getCodeForCountryName } from "@/config/regionOptions";
import { computeDiggerProfileDetailCompletion } from "@/lib/profileCompletion";

interface Gig {
  id: string;
  consumer_id: string | null;
  client_name: string | null;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
  location: string;
  timeline?: string | null;
  category_id?: string | null;
  requirements?: string | null;
  preferred_regions?: string[] | null;
  skills_required?: string[] | null;
  gig_skills?: { skills: { name: string } | null }[] | null;
  consumer_email?: string | null;
  consumer_phone?: string | null;
  poster_country?: string | null;
  categories: {
    name: string;
    description: string | null;
  } | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
    timezone: string | null;
    email_verified: boolean | null;
    phone_verified: boolean | null;
    payment_verified: boolean | null;
    id_verified: boolean | null;
    social_verified: boolean | null;
  } | null;
}

/** Gigger project counts (for "About the client" card) */
interface ClientGigStats {
  open: number;
  active: number;
  completed: number;
  total: number;
}

const GigDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDigger, setIsDigger] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [diggerId, setDiggerId] = useState<string | null>(null);
  /** Diggers can bid only after they have profile photo and hourly rate set ("at rest" minimum). */
  const [diggerCanBid, setDiggerCanBid] = useState(false);
  const [existingBid, setExistingBid] = useState<any>(null);
  const [canSeeBudget, setCanSeeBudget] = useState(false);
  const [hasLeadPurchase, setHasLeadPurchase] = useState(false);
  const REFERRAL_FEE_RATE = 0.08;
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  const { userRoles, activeRole } = useAuth();
  /** In gigger mode we hide digger-only content (bid form, budget analysis, etc.); in digger mode or no role we show it for diggers */
  const showDiggerContent = isDigger && (activeRole !== "gigger");
  /** Bids stats for right sidebar (when owner) */
  const [bidStats, setBidStats] = useState<BidStats | null>(null);
  /** Bids filters (when owner) */
  const [bidFilters, setBidFilters] = useState<BidFilters>(defaultBidFilters);
  /** Bids sort order (when owner) */
  const [bidSortBy, setBidSortBy] = useState<BidSortOption>("lowest_price");

  const hasActiveFilters =
    (bidFilters.search?.trim() ?? "") !== "" ||
    (bidFilters.priceMin?.trim() ?? "") !== "" ||
    (bidFilters.priceMax?.trim() ?? "") !== "" ||
    (bidFilters.timeline?.trim() ?? "") !== "" ||
    (bidFilters.minRating?.trim() ?? "") !== "" ||
    (bidFilters.location?.trim() ?? "") !== "" ||
    bidFilters.verifiedOnly;
  const activeFilterCount = [
    bidFilters.search?.trim(),
    bidFilters.priceMin?.trim(),
    bidFilters.priceMax?.trim(),
    bidFilters.timeline?.trim(),
    bidFilters.minRating?.trim(),
    bidFilters.location?.trim(),
    bidFilters.verifiedOnly,
  ].filter(Boolean).length;

  useEffect(() => {
    loadData();
  }, [id, userRoles]);

  // If user has digger role but diggerId never set (e.g. roles loaded after first run), load digger profile so they can bid
  useEffect(() => {
    if (!id || !gig || !currentUser || !userRoles?.includes("digger") || activeRole === "gigger" || diggerId != null) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      const { data: existingProfile } = await supabase
        .from("digger_profiles" as any)
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const row = existingProfile as unknown as { id: string } | null;
      if (cancelled || !row) return;
      setIsDigger(true);
      setDiggerId(row.id);
      const { data: diggerDetail } = await supabase
        .from("digger_profiles" as any)
        .select("id, profile_image_url, hourly_rate, hourly_rate_min, hourly_rate_max, profiles!digger_profiles_user_id_fkey(avatar_url)")
        .eq("id", row.id)
        .single();
      if (cancelled) return;
      const raw = diggerDetail as { profiles?: { avatar_url?: string | null } | { avatar_url?: string | null }[] | null } | null;
      const profilesNorm = raw?.profiles != null ? (Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles) : null;
      const completion = computeDiggerProfileDetailCompletion(raw ? { ...raw, profiles: profilesNorm } : null);
      const profilePhotoDone = completion.items.find((i) => i.id === "profile-photo")?.completed ?? false;
      const hourlyRateDone = completion.items.find((i) => i.id === "hourly-rate")?.completed ?? false;
      if (!cancelled) setDiggerCanBid(profilePhotoDone && hourlyRateDone);
      const { data: bid } = await supabase.from("bids" as any).select("*").eq("gig_id", id).eq("digger_id", row.id).maybeSingle();
      if (!cancelled) setExistingBid(bid ?? null);
      if (!cancelled) setCanSeeBudget(true);
    })();
    return () => { cancelled = true; };
  }, [id, gig, currentUser, userRoles, activeRole, diggerId]);

  useEffect(() => {
    // Scroll to bid section (#bid) only after gig is loaded so the target (form or Sign In card) exists
    if (window.location.hash !== '#bid' || loading || !gig) return;

    const scrollToBid = () => {
      const bidElement = document.getElementById('bid');
      if (bidElement) {
        bidElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };

    if (!scrollToBid()) {
      // Brief retry in case DOM just updated
      const t = setTimeout(() => scrollToBid(), 300);
      return () => clearTimeout(t);
    }
  }, [id, loading, gig, isDigger, diggerId, existingBid]);

  // Diggers can only message client after the client has sent a message first; stay in sync via realtime
  useEffect(() => {
    if (!id || !diggerId || !gig?.consumer_id) {
      setHasClientSentMessage(false);
      return;
    }
    const consumerId = gig.consumer_id;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      try {
        const { data: conv } = await supabase
          .from("conversations" as any)
          .select("id")
          .eq("gig_id", id)
          .eq("digger_id", diggerId)
          .eq("consumer_id", consumerId)
          .maybeSingle();
        if (cancelled || !conv) {
          if (!cancelled) setHasClientSentMessage(false);
          return;
        }
        const convId = (conv as any).id;
        const { count } = await supabase
          .from("messages" as any)
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("sender_id", consumerId);
        if (!cancelled && count != null && count > 0) setHasClientSentMessage(true);
        else if (!cancelled) setHasClientSentMessage(false);

        if (cancelled) return;
        channel = supabase
          .channel(`gig-detail-messages:${convId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${convId}`,
            },
            (payload: { new: { sender_id?: string } }) => {
              if (cancelled) return;
              if (payload.new?.sender_id === consumerId) setHasClientSentMessage(true);
            }
          )
          .subscribe();
      } catch {
        if (!cancelled) setHasClientSentMessage(false);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [id, diggerId, gig?.consumer_id]);

  const loadData = async () => {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user || null);

    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .single();
      // Treat as digger if profiles.user_type is "digger" OR user has digger role (user_roles table)
      const userIsDigger = profile?.user_type === "digger" || (userRoles && userRoles.includes("digger"));
      setIsDigger(userIsDigger);
      if (!userIsDigger) setDiggerCanBid(false);

      if (userIsDigger) {
        let diggerProfileRow: { id: string } | null = null;
        const { data: existingProfile } = await supabase
          .from("digger_profiles" as any)
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        diggerProfileRow = existingProfile as unknown as { id: string } | null;

        // Create minimal digger profile if none exists so they can complete photo + rate and then bid
        if (!diggerProfileRow) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", session.user.id)
            .single();
          const businessName = (profileRow?.full_name && String(profileRow.full_name).trim()) || "My Business";
          const { data: created } = await supabase
            .from("digger_profiles" as any)
            .insert({
              user_id: session.user.id,
              business_name: businessName,
              location: "Not set",
              phone: "Not set",
            } as any)
            .select("id")
            .single();
          diggerProfileRow = created as unknown as { id: string } | null;
        }

        if (diggerProfileRow) {
          setDiggerId(diggerProfileRow.id);

          // At-rest minimum to bid: profile photo and hourly rate — use same completion logic as profile/dashboard so 20% = can bid
          const { data: diggerDetail } = await supabase
            .from("digger_profiles" as any)
            .select("id, profile_image_url, hourly_rate, hourly_rate_min, hourly_rate_max, profiles!digger_profiles_user_id_fkey(avatar_url)")
            .eq("id", diggerProfileRow.id)
            .single();
          // Normalize profiles (join can return object or array) so completion logic matches profile page
          const raw = diggerDetail as { profiles?: { avatar_url?: string | null } | { avatar_url?: string | null }[] | null } | null;
          const profilesNorm = raw?.profiles != null
            ? (Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles)
            : null;
          const completion = computeDiggerProfileDetailCompletion(raw ? { ...raw, profiles: profilesNorm } : null);
          const profilePhotoDone = completion.items.find((i) => i.id === "profile-photo")?.completed ?? false;
          const hourlyRateDone = completion.items.find((i) => i.id === "hourly-rate")?.completed ?? false;
          setDiggerCanBid(profilePhotoDone && hourlyRateDone);

          // Check for existing bid
          const { data: bid } = await supabase
            .from("bids" as any)
            .select("*")
            .eq("gig_id", id)
            .eq("digger_id", diggerProfileRow.id)
            .maybeSingle();

          setExistingBid(bid as any);

          // Check if digger has purchased this lead
          const { data: leadPurchase } = await supabase
            .from("lead_purchases")
            .select("id")
            .eq("gig_id", id)
            .eq("digger_id", diggerProfileRow.id)
            .eq("status", "completed")
            .maybeSingle();

          setHasLeadPurchase(!!leadPurchase);

          // Diggers can see budget so they can tailor their proposal and bid within range
          setCanSeeBudget(true);
        } else {
          setDiggerCanBid(false);
        }
      } else {
        // Non-diggers (consumers) can always see budget
        setCanSeeBudget(true);
      }
    }

    // Do not request contact fields here so diggers never receive gigger contact info; owner fetches them separately
    const { data: gigData, error: gigError } = await (supabase
      .from("gigs") as any)
      .select(`
        id, consumer_id, title, description, budget_min, budget_max, timeline, location, category_id, requirements,
        preferred_regions, status, confirmation_status, is_confirmed_lead, confirmed_at, created_at, updated_at,
        purchase_count, calculated_price_cents, bumped_at, deadline, poster_country, skills_required,
        awarded_at, awarded_bid_id, awarded_digger_id,
        categories (name, description),
        profiles!gigs_consumer_id_fkey (full_name, avatar_url, country, timezone, email_verified, phone_verified, payment_verified, id_verified, social_verified),
        gig_skills (skills (name))
      `)
      .eq("id", id)
      .single();

    if (gigError || !gigData) {
      toast({
        title: "Gig not found",
        variant: "destructive",
      });
      navigate("/browse-gigs");
      return;
    }

    setGig(gigData as Gig);
    const isOwner = session?.user?.id === gigData.consumer_id;
    setIsOwner(isOwner);

    // Only the gig owner should receive contact fields (for edit/manage); diggers get them only after unlock/award
    if (isOwner && session?.user?.id) {
      const { data: contactRow } = await supabase
        .from("gigs")
        .select("client_name, consumer_email, consumer_phone")
        .eq("id", id)
        .eq("consumer_id", session.user.id)
        .single();
      if (contactRow) {
        setGig((prev) => prev ? { ...prev, ...contactRow } : prev);
      }
    }

    // Fetch client (Gigger) project counts for "About the client" card
    if (gigData.consumer_id) {
      const { data: gigs } = await supabase
        .from("gigs")
        .select("id, status, awarded_at")
        .eq("consumer_id", gigData.consumer_id);
      const list = gigs ?? [];
      const open = list.filter((g: { status: string }) => g.status === "open").length;
      const active = list.filter((g: { status: string; awarded_at?: string | null }) =>
        g.status === "in_progress" || (g.awarded_at != null && g.status !== "completed")
      ).length;
      const completed = list.filter((g: { status: string }) => g.status === "completed").length;
      setClientGigStats({ open, active, completed, total: list.length });
    } else {
      setClientGigStats(null);
    }

    setLoading(false);

    // Track ViewContent event for Facebook Pixel
    if (fbConfigured && gigData) {
      trackFBEvent('ViewContent', {
        content_name: gigData.title,
        content_ids: [gigData.id],
        content_type: 'gig',
        value: gigData.budget_min || 0,
        currency: 'USD',
      });
    }
  };

  const getGigSkillNames = (g: Gig | null): string[] => {
    if (!g) return [];
    // Prefer skills_required so both DB-selected and manually entered skills are shown
    if (g.skills_required && g.skills_required.length > 0) return g.skills_required;
    const fromJunction = (g.gig_skills || []).map((gs) => gs.skills?.name).filter((n): n is string => Boolean(n));
    return fromJunction;
  };

  const formatBudget = (min: number | null, max: number | null): string => {
    if (!min && !max) return "Budget not specified";
    if (!max) return `$${min?.toLocaleString()}+`;
    if (!min) return `Up to $${max?.toLocaleString()}`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
  };

  /** Format current time in client's timezone for "About the client" card */
  const formatClientLocalTime = (timezone: string | null): string => {
    if (!timezone || !timezone.trim()) return "";
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone.trim(),
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      });
      return formatter.format(new Date());
    } catch {
      return "";
    }
  };

  const [bumping, setBumping] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [expandSuccessCoverLetter, setExpandSuccessCoverLetter] = useState(false);
  const [hasClientSentMessage, setHasClientSentMessage] = useState(false);
  const [editingProposal, setEditingProposal] = useState(false);
  const [clientGigStats, setClientGigStats] = useState<ClientGigStats | null>(null);
  const PROPOSAL_PREVIEW_LEN = 280;

  const handleBump = async () => {
    if (!id || !gig) return;
    setBumping(true);
    const { error } = await supabase
      .from("gigs")
      .update({ bumped_at: new Date().toISOString() } as any)
      .eq("id", id);
    setBumping(false);
    if (error) {
      toast({ title: "Failed to bump listing", variant: "destructive" });
    } else {
      toast({ title: "Listing bumped to the top. More diggers will see it." });
      loadData();
    }
  };

  const handleRepost = async () => {
    if (!gig?.consumer_id) {
      toast({ title: "Sign in with the account that posted this gig to repost.", variant: "destructive" });
      return;
    }
    if (!window.confirm("Create a new listing with the same details? Your current listing stays as is. Diggers will be notified.")) return;
    setReposting(true);
    const insertPayload = {
      title: gig.title,
      description: gig.description,
      budget_min: gig.budget_min ?? null,
      budget_max: gig.budget_max ?? null,
      timeline: gig.timeline ?? null,
      location: gig.location ?? "Remote",
      category_id: gig.category_id ?? null,
      consumer_id: gig.consumer_id,
      requirements: gig.requirements ?? null,
      preferred_regions: gig.preferred_regions ?? null,
      poster_country: gig.poster_country ?? null,
      status: "open",
      consumer_email: gig.consumer_email ?? null,
      client_name: gig.client_name ?? null,
      consumer_phone: gig.consumer_phone ?? null,
      confirmation_status: "confirmed",
      is_confirmed_lead: true,
    };
    const { data: newGig, error } = await supabase.from("gigs").insert(insertPayload).select("id").single();
    setReposting(false);
    if (error) {
      toast({ title: "Failed to repost. Try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Reposted! Your new listing is live." });
    supabase.functions.invoke("send-gig-email-by-settings", { body: { gigId: newGig.id } }).catch(() => {});
    navigate(`/gig/${newGig.id}`);
  };

  const handleRemoveGig = async () => {
    if (!id || !gig) return;
    if (!window.confirm("Remove this gig? It will be closed and no longer visible to diggers. You can still view it in My Gigs.")) return;
    setRemoving(true);
    const { error } = await supabase
      .from("gigs" as any)
      .update({ status: "cancelled" } as any)
      .eq("id", id);
    setRemoving(false);
    if (error) {
      toast({ title: "Failed to remove gig", variant: "destructive" });
      return;
    }
    toast({ title: "Gig removed." });
    navigate("/my-gigs");
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to send messages",
        variant: "destructive",
      });
      navigate("/register");
      return;
    }

    if (!diggerId) {
      toast({
        title: "Digger profile required",
        description: "Please complete your digger registration first",
        variant: "destructive",
      });
      return;
    }

    try {
      // For anonymous gigs (consumer_id is null), we can't create conversations
      // Diggers should contact via email/phone instead
      if (!gig.consumer_id) {
        toast({
          title: "Contact Information",
          description: "This is an anonymous posting. Please use the contact information provided when you unlock the lead.",
          variant: "default",
        });
        return;
      }

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from("conversations" as any)
        .select("id")
        .eq("gig_id", id!)
        .eq("digger_id", diggerId)
        .eq("consumer_id", gig.consumer_id)
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages?conversation=${(existingConv as any).id}`);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("conversations" as any)
        .insert({
          gig_id: id,
          digger_id: diggerId,
          consumer_id: gig.consumer_id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      navigate(`/messages?conversation=${(newConv as any).id}`);
    } catch (error: any) {
      toast({
        title: "Error starting conversation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!gig) return null;

  const budgetText = gig.budget_min && gig.budget_max 
    ? `$${gig.budget_min.toLocaleString()} - $${gig.budget_max.toLocaleString()}`
    : gig.budget_min 
    ? `From $${gig.budget_min.toLocaleString()}`
    : 'Budget negotiable';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${gig.title} - Service Project in ${gig.location}`}
        description={`${gig.description.substring(0, 150)}... Budget: ${budgetText}. Posted ${formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}. Find qualified professionals on digsandgigs.`}
        keywords={`${gig.title}, ${gig.location}, service project, hire contractor, ${gig.categories?.name || 'services'}${getGigSkillNames(gig).length ? `, ${getGigSkillNames(gig).join(', ')}` : ''}`}
        structuredData={generateJobPostingSchema({
          title: gig.title,
          description: gig.description,
          location: gig.location,
          datePosted: gig.created_at,
          validThrough: gig.deadline || undefined,
          baseSalary: gig.budget_min ? {
            value: gig.budget_min,
            currency: "USD",
            unitText: "PROJECT"
          } : undefined
        })}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-10 gap-6 lg:gap-8">
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={gig.status === 'open' ? 'default' : 'secondary'}>
                    {gig.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Posted {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}
                  </span>
                </div>
                <CardTitle className="text-3xl">{gig.title}</CardTitle>
                {isOwner && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-2 border-t">
                    {gig.status === "open" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBump}
                        disabled={bumping}
                        title="Bump this listing to the top so more diggers see it"
                      >
                        {bumping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                        Bump listing
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRepost}
                      disabled={reposting || !gig.consumer_id}
                      title="Create a new listing with the same details"
                    >
                      {reposting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
                      Repost
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/gig/${id}/edit`)} title="Edit gig details">
                      <Pencil className="h-4 w-4" />
                      Edit gig
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/my-gigs")}>
                      Manage in My Gigs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveGig}
                      disabled={removing || gig.status !== "open"}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Close and remove this gig"
                    >
                      {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Remove gig
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{gig.description}</p>
                </div>

                {getGigSkillNames(gig).length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Diggers with these skills can tailor their proposals to your project.
                  </p>
                )}

                {/* At-a-glance: category, budget, location, pref regions, poster country — displayed under description */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground rounded-xl bg-muted/40 px-4 py-3 border border-transparent">
                  {gig.categories && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-4 w-4 shrink-0 text-primary" />
                      <span>{gig.categories.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 shrink-0 text-primary" />
                    <span>{canSeeBudget ? formatBudget(gig.budget_min, gig.budget_max) : (showDiggerContent ? "Submit a bid to view budget" : formatBudget(gig.budget_min, gig.budget_max))}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span>{gig.location || "Remote"}</span>
                  </div>
                  {gig.preferred_regions && gig.preferred_regions.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-primary opacity-80" />
                      <span className="text-xs">Pref: {formatSelectionDisplay(gig.preferred_regions)}</span>
                    </div>
                  )}
                  {gig.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 shrink-0 text-primary" />
                      <span>Due {new Date(gig.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {gig.poster_country && (
                    <div className="flex items-center gap-1.5" title={gig.poster_country}>
                      {getCodeForCountryName(gig.poster_country) ? (
                        <img
                          src={`https://flagcdn.com/w20/${getCodeForCountryName(gig.poster_country).toLowerCase()}.png`}
                          alt=""
                          className="h-4 w-5 object-cover rounded-sm shrink-0"
                          width={20}
                          height={15}
                        />
                      ) : null}
                      <span className="uppercase font-medium text-foreground">{getCodeForCountryName(gig.poster_country) || gig.poster_country}</span>
                    </div>
                  )}
                </div>
                {getGigSkillNames(gig).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {getGigSkillNames(gig).map((skill, i) => (
                      <Badge key={i} variant="secondary" className="rounded-lg px-2.5 py-0.5 font-normal text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Budget Analysis for Diggers (hidden in gigger mode) */}
            {showDiggerContent && gig.budget_min && (
              <Card className="bg-accent/5 border-accent/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-accent" />
                    Budget Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {gig.budget_min && gig.budget_max ? (
                        <>
                          This gig has a budget range of <strong className="text-foreground">${gig.budget_min.toLocaleString()} - ${gig.budget_max.toLocaleString()}</strong>.
                          {gig.budget_min < 1000 && " This is a smaller project, great for quick turnaround work."}
                          {gig.budget_min >= 1000 && gig.budget_min < 5000 && " This is a mid-sized project with good earning potential."}
                          {gig.budget_min >= 5000 && " This is a substantial project with significant earning potential."}
                        </>
                      ) : (
                        <>
                          This gig has a minimum budget of <strong className="text-foreground">${gig.budget_min.toLocaleString()}+</strong>.
                          {gig.budget_min < 1000 && " This is a smaller project, great for quick turnaround work."}
                          {gig.budget_min >= 1000 && gig.budget_min < 5000 && " This is a mid-sized project with good earning potential."}
                          {gig.budget_min >= 5000 && " This is a substantial project with significant earning potential."}
                        </>
                      )}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">When you&apos;re awarded:</p>
                    {(() => {
                      const minFee = gig.budget_min * REFERRAL_FEE_RATE;
                      const maxFee = gig.budget_max ? gig.budget_max * REFERRAL_FEE_RATE : null;
                      const minPayout = gig.budget_min - minFee;
                      const maxPayout = gig.budget_max ? gig.budget_max - (maxFee ?? 0) : null;
                      return (
                        <div className="bg-background/50 rounded-lg p-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">If you bid ${gig.budget_min.toLocaleString()}:</span>
                            <span className="font-semibold text-accent">${Math.round(minPayout).toLocaleString()} to you</span>
                          </div>
                          {maxPayout != null && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">If you bid ${gig.budget_max!.toLocaleString()}:</span>
                              <span className="font-semibold text-accent">${Math.round(maxPayout).toLocaleString()} to you</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                            <span>8% referral fee (from Gigger&apos;s deposit)</span>
                            <span>No membership required</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit or edit proposal — only when profile has photo + hourly rate (at-rest minimum) */}
            {showDiggerContent && diggerId && diggerCanBid && gig.status === 'open' && !existingBid && (
              <div id="bid">
                <BidSubmissionTemplate
                  gigId={id!}
                  diggerId={diggerId}
                  onSuccess={() => {
                    toast({
                      title: "Proposal submitted",
                      description: "The client will review your proposal. We’ll notify you when there’s an update.",
                    });
                    loadData().then(() => {
                      setTimeout(() => {
                        document.getElementById("bid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 150);
                    });
                  }}
                />
              </div>
            )}
            {showDiggerContent && diggerId && gig.status === 'open' && existingBid && editingProposal && (
              <div id="bid">
                <BidSubmissionTemplate
                  gigId={id!}
                  diggerId={diggerId}
                  existingBid={{
                    id: existingBid.id,
                    proposal: existingBid.proposal || "",
                    amount_min: existingBid.amount_min ?? existingBid.amount ?? 0,
                    amount_max: existingBid.amount_max ?? existingBid.amount ?? 0,
                    timeline: existingBid.timeline || "",
                    payment_terms: existingBid.payment_terms ?? undefined,
                    milestones: existingBid.milestones ?? undefined,
                    accepted_payment_methods: existingBid.accepted_payment_methods ?? undefined,
                  }}
                  onSuccess={() => {
                    setEditingProposal(false);
                    loadData();
                    toast({ title: "Proposal updated", description: "Your changes have been saved." });
                    setTimeout(() => document.getElementById("bid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                  }}
                />
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setEditingProposal(false)}>
                  Cancel
                </Button>
              </div>
            )}
            {existingBid && showDiggerContent && !editingProposal && (
              <Card id="bid" className="overflow-hidden rounded-2xl border shadow-sm bg-gradient-to-b from-primary/5 to-background">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl">Your proposal</CardTitle>
                      <CardDescription className="mt-1">
                        {existingBid.status === "accepted"
                          ? "You were selected. Check Messages to coordinate next steps."
                          : existingBid.status === "rejected"
                            ? "The client went with another proposal. Browse more gigs to find your next opportunity."
                            : "The client will review your proposal. You’ll be notified if they have questions or when they decide."}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge
                      variant={
                        existingBid.status === "accepted"
                          ? "default"
                          : existingBid.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {existingBid.status === "pending" ? "Under review" : existingBid.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <div className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed amount</span>
                      <p className="mt-0.5 font-semibold text-foreground">
                        {existingBid.amount_min != null && existingBid.amount_max != null
                          ? `$${Number(existingBid.amount_min).toLocaleString()} – $${Number(existingBid.amount_max).toLocaleString()}`
                          : `$${Number(existingBid.amount || 0).toLocaleString()}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Timeline</span>
                      <p className="mt-0.5 font-medium text-foreground">{existingBid.timeline || "—"}</p>
                    </div>
                  </div>
                  {existingBid.proposal && (
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        Cover letter
                      </div>
                      <p className="mt-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {existingBid.proposal.length <= PROPOSAL_PREVIEW_LEN || expandSuccessCoverLetter
                          ? existingBid.proposal
                          : existingBid.proposal.slice(0, PROPOSAL_PREVIEW_LEN) + "..."}
                      </p>
                      {existingBid.proposal.length > PROPOSAL_PREVIEW_LEN && (
                        <button
                          type="button"
                          onClick={() => setExpandSuccessCoverLetter(!expandSuccessCoverLetter)}
                          className="mt-2 inline-flex items-center gap-1 text-primary hover:underline font-medium text-sm"
                        >
                          {expandSuccessCoverLetter ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              View less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              View more
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    What happens next: The client may message you with questions or to award the gig. You can message them from here or from Messages.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {gig.status === "open" && (
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditingProposal(true)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit proposal
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/my-bids")}>
                      View in My Bids
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    {gig?.consumer_id && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={handleSendMessage}
                        disabled={!hasClientSentMessage}
                        title={hasClientSentMessage ? "Open conversation with the client" : "You can reply after the client sends you a message first"}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Message client
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/browse-gigs")}>
                      Browse more gigs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {activeRole === 'gigger' && !isOwner && currentUser && gig.status === 'open' && (
              <Card id="bid">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-center text-muted-foreground">
                    You’re viewing as a <strong>Gigger</strong>. Post your own gig to receive bids from Diggers.
                  </p>
                  <Button className="w-full" variant="outline" onClick={() => navigate('/post-gig')}>
                    Post a gig
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Have a Digger account? Switch to Digger mode in the nav to bid on this gig.
                  </p>
                </CardContent>
              </Card>
            )}
            {currentUser && (!isDigger || !diggerId) && !isOwner && gig.status === 'open' && !userRoles?.includes('digger') && activeRole !== 'gigger' && (
              <Card id="bid">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Only <strong>Diggers</strong> can bid on gigs. Switch to Digger to bid, or post your own gigs as a Gigger.
                  </p>
                </CardContent>
              </Card>
            )}
            {currentUser && (!isDigger || !diggerId) && !isOwner && gig.status === 'open' && userRoles?.includes('digger') && activeRole !== 'gigger' && (
              <Card id="bid">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-center text-muted-foreground">
                    To place a bid you need an active <strong>Digger</strong> profile.
                  </p>
                  <Button className="w-full" onClick={() => navigate('/role-dashboard')}>
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
            {showDiggerContent && diggerId && !diggerCanBid && !existingBid && gig.status === 'open' && (
              <Card id="bid">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-center text-muted-foreground">
                    To place a bid, add a <strong>profile photo</strong> and <strong>hourly rate</strong> to your Digger profile.
                  </p>
                  <Button className="w-full" onClick={() => navigate('/role-dashboard')}>
                    Complete profile
                  </Button>
                </CardContent>
              </Card>
            )}
            {!currentUser && !isOwner && gig.status === 'open' && (
              <Card id="bid">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground mb-4">Want to bid on this gig?</p>
                  <Button className="w-full" onClick={() => navigate('/register')}>
                    Sign in as Digger
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Free Estimate Diggers - shown to consumers and diggers */}
            <FreeEstimateDiggers 
              gigId={id!} 
              categories={gig.categories?.name ? [gig.categories.name] : undefined}
            />

            {/* Bids Section: owner sees full list; digger sees header + stats only (no bid cards) */}
            {(isOwner || showDiggerContent) && (
              <BidsList
                gigId={id!}
                gigTitle={gig.title}
                isOwner={isOwner}
                isFixedPrice={!!(gig.budget_min && gig.budget_max)}
                currentDiggerId={diggerId}
                filterState={bidFilters}
                onFilterChange={setBidFilters}
                onStats={setBidStats}
                statsInSidebar={isOwner}
                sortBy={bidSortBy}
                onClearFilters={() => setBidFilters(defaultBidFilters)}
              />
            )}
          </div>

          {/* Right sidebar (3 cols): for owner = bids stats + filters; for Diggers = client info */}
          <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-4 lg:self-start">
            {isOwner && (
              <>
                {/* Showing X of Y + sort */}
                <div className="flex flex-col gap-2">
                  {bidStats && (
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{bidStats.totalBids}</span>
                      {bidStats.totalUnfiltered != null && bidStats.totalUnfiltered !== bidStats.totalBids && (
                        <> of <span className="font-medium text-foreground">{bidStats.totalUnfiltered}</span></>
                      )}
                      {" "}bid{(bidStats.totalBids === 1 ? "" : "s")}
                      {hasActiveFilters && (
                        <span className="ml-1.5 text-xs text-primary">({activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active)</span>
                      )}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sort by</Label>
                    <Select value={bidSortBy} onValueChange={(v) => setBidSortBy(v as BidSortOption)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BID_SORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Bids stats */}
                <Card className="border-border/60 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Bid summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Total bids</span>
                      <span className="font-semibold tabular-nums">{bidStats?.totalBids ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Avg price</span>
                      <span className="font-semibold tabular-nums text-primary">
                        ${(bidStats ? Math.round(bidStats.avgPrice) : 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Lowest</span>
                      <span className="font-semibold tabular-nums text-green-600">
                        ${(bidStats?.lowestAmount ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                {/* Quick filters */}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant={bidFilters.minRating === "4" ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setBidFilters((f) => ({ ...f, minRating: f.minRating === "4" ? "" : "4" }))}
                  >
                    4+ stars
                  </Button>
                  <Button
                    variant={bidFilters.verifiedOnly ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setBidFilters((f) => ({ ...f, verifiedOnly: !f.verifiedOnly }))}
                  >
                    Verified
                  </Button>
                  <Button
                    variant={bidFilters.priceMax === "5000" ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setBidFilters((f) => ({ ...f, priceMax: f.priceMax === "5000" ? "" : "5000" }))}
                  >
                    Under $5k
                  </Button>
                </div>
                {/* Filters */}
                <Card className="border-border/60 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Filter className="h-4 w-4 text-primary" />
                      Filter Diggers
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Narrow bids by proposal, price, timeline, rating, or location.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bid-filter-search" className="text-xs">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="bid-filter-search"
                          placeholder="Name, @handle, proposal, location..."
                          value={bidFilters.search}
                          onChange={(e) => setBidFilters((f) => ({ ...f, search: e.target.value }))}
                          className="pl-8 h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="bid-filter-pricemin" className="text-xs">Min $</Label>
                        <Input
                          id="bid-filter-pricemin"
                          type="number"
                          min={0}
                          placeholder="0"
                          value={bidFilters.priceMin}
                          onChange={(e) => setBidFilters((f) => ({ ...f, priceMin: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bid-filter-pricemax" className="text-xs">Max $</Label>
                        <Input
                          id="bid-filter-pricemax"
                          type="number"
                          min={0}
                          placeholder="Any"
                          value={bidFilters.priceMax}
                          onChange={(e) => setBidFilters((f) => ({ ...f, priceMax: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bid-filter-timeline" className="text-xs">Timeline</Label>
                      <Input
                        id="bid-filter-timeline"
                        placeholder="e.g. 2 weeks"
                        value={bidFilters.timeline}
                        onChange={(e) => setBidFilters((f) => ({ ...f, timeline: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bid-filter-rating" className="text-xs">Min rating</Label>
                      <Input
                        id="bid-filter-rating"
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        placeholder="Any"
                        value={bidFilters.minRating}
                        onChange={(e) => setBidFilters((f) => ({ ...f, minRating: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bid-filter-location" className="text-xs">Location</Label>
                      <Input
                        id="bid-filter-location"
                        placeholder="Country, state, or city"
                        value={bidFilters.location}
                        onChange={(e) => setBidFilters((f) => ({ ...f, location: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 mt-1"
                      onClick={() => setBidFilters(defaultBidFilters)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear filters
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
            {!isOwner && activeRole !== "gigger" && (
              <Card className="border-muted/50 bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    About the client
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Photo + name (user-level, same for Digger/Gigger) */}
                  {(gig.profiles?.avatar_url || gig.profiles?.full_name || gig.client_name) && (
                    <div className="flex items-center gap-3">
                      {gig.profiles?.avatar_url ? (
                        <img
                          src={gig.profiles.avatar_url}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover shrink-0"
                          width={48}
                          height={48}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Client</div>
                        <div className="font-medium truncate">
                          {gig.profiles?.full_name?.trim() || gig.client_name?.trim() || "Client"}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Nationality (user-level; fallback to gig poster_country) */}
                  {(() => {
                    const country = gig.profiles?.country ?? gig.poster_country ?? null;
                    if (!country) return <p className="text-sm text-muted-foreground">Client location not specified.</p>;
                    const code = getCodeForCountryName(country);
                    return (
                      <div className="flex items-center gap-3">
                        {code ? (
                          <img
                            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                            alt=""
                            className="h-8 w-10 object-cover rounded shrink-0"
                            width={40}
                            height={32}
                          />
                        ) : null}
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">Nationality</div>
                          <div className="font-medium">{code ? `${code} · ${country}` : country}</div>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Local time (user-level timezone) */}
                  {formatClientLocalTime(gig.profiles?.timezone ?? null) && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Local time</div>
                        <div className="text-sm font-medium">{formatClientLocalTime(gig.profiles?.timezone ?? null)}</div>
                      </div>
                    </div>
                  )}
                  {/* Verification badges (user-level) */}
                  {(gig.profiles?.email_verified || gig.profiles?.phone_verified || gig.profiles?.payment_verified || gig.profiles?.id_verified || gig.profiles?.social_verified) && (
                    <div className="flex flex-wrap gap-1.5">
                      {gig.profiles?.email_verified && (
                        <Badge variant="secondary" className="text-xs gap-0.5">
                          <Mail className="h-3 w-3" /> Email
                        </Badge>
                      )}
                      {gig.profiles?.phone_verified && (
                        <Badge variant="secondary" className="text-xs gap-0.5">
                          <Phone className="h-3 w-3" /> Phone
                        </Badge>
                      )}
                      {gig.profiles?.payment_verified && (
                        <Badge variant="secondary" className="text-xs gap-0.5">
                          <CreditCard className="h-3 w-3" /> Payment
                        </Badge>
                      )}
                      {gig.profiles?.id_verified && (
                        <Badge variant="secondary" className="text-xs gap-0.5">
                          <IdCard className="h-3 w-3" /> ID
                        </Badge>
                      )}
                      {gig.profiles?.social_verified && (
                        <Badge variant="secondary" className="text-xs gap-0.5">
                          <Share2 className="h-3 w-3" /> Social
                        </Badge>
                      )}
                    </div>
                  )}
                  {/* Project stats (Gigger) */}
                  {clientGigStats && clientGigStats.total >= 0 && (
                    <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Projects</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                        <span>Open: <strong>{clientGigStats.open}</strong></span>
                        <span>Active: <strong>{clientGigStats.active}</strong></span>
                        <span>Completed: <strong>{clientGigStats.completed}</strong></span>
                        <span>Total: <strong>{clientGigStats.total}</strong></span>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Posted</div>
                    <div className="text-sm font-medium">{formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}</div>
                  </div>
                  {!isOwner && gig.status === 'open' && (
                    <p className="text-xs text-muted-foreground border-t pt-3">
                      Submit a proposal below or buy the lead to unlock contact and reach out directly.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {showDiggerContent && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Bid or buy — no membership</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    When you’re awarded the gig, we charge an <strong>8% referral fee</strong> (from the client's deposit). 
                    You can also buy the lead upfront to unlock contact. No subscription required.
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GigDetail;
