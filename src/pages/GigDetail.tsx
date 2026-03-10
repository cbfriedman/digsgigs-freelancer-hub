import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Tag, User, Loader2, Award, MessageSquare, RefreshCw, Copy, MapPin, CheckCircle2, FileText, ChevronDown, ChevronUp, Trash2, Pencil, Mail, Phone, CreditCard, IdCard, Share2, Clock, Search, Filter, X, Unlock, Briefcase, FolderOpen } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { BidSubmissionTemplate } from "@/components/BidSubmissionTemplate";
import { BidsList, defaultBidFilters, type BidFilters, type BidStats, type BidSortOption } from "@/components/BidsList";
import { FreeEstimateDiggers } from "@/components/FreeEstimateDiggers";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { generateJobPostingSchema } from "@/components/StructuredData";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { StripeConnectBanner } from "@/components/StripeConnectBanner";
import { CartDrawer } from "@/components/CartDrawer";
import { formatSelectionDisplay, getCodeForCountryName } from "@/config/regionOptions";
import { getLocalTimeForLocation } from "@/pages/DiggerDetail/utils";
import { getLeadPriceDisplay, LEAD_PRICE_CAPTION } from "@/lib/leadPrice";
import { cn } from "@/lib/utils";
import { navigateToSignUp } from "@/lib/navigateToLogin";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { MESSAGES_SYNC_EVENT } from "@/lib/messagesSync";
import { openFloatingChat, dispatchAwardAccepted, dispatchRefetchGigChatMessages } from "@/lib/openFloatingChat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Gig {
  id: string;
  consumer_id: string | null;
  client_name: string | null;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  project_type?: "fixed" | "hourly" | null;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  estimated_hours_min?: number | null;
  estimated_hours_max?: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
  location: string;
  work_type?: string | null;
  timeline?: string | null;
  category_id?: string | null;
  requirements?: string | null;
  preferred_regions?: string[] | null;
  skills_required?: string[] | null;
  gig_skills?: { skills: { name: string } | null }[] | null;
  consumer_email?: string | null;
  consumer_phone?: string | null;
  poster_country?: string | null;
  awarded_at?: string | null;
  awarded_bid_id?: string | null;
  awarded_digger_id?: string | null;
  categories: {
    name: string;
    description: string | null;
  } | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
    state?: string | null;
    city?: string | null;
    timezone: string | null;
    created_at?: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDigger, setIsDigger] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [diggerId, setDiggerId] = useState<string | null>(null);
  /** Diggers can bid once they have a digger profile. */
  const [diggerCanBid, setDiggerCanBid] = useState(false);
  const [existingBid, setExistingBid] = useState<any>(null);
  const [canSeeBudget, setCanSeeBudget] = useState(false);
  const [hasLeadPurchase, setHasLeadPurchase] = useState(false);
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  const { userRoles, activeRole, switchRole } = useAuth();
  /** Admins can view all project data like owner (bids, payments, status) */
  const isAdmin = userRoles?.includes("admin") ?? false;
  /** Owner view (bids, award, filters) only when in Gigger mode; admins always see owner view */
  const canViewAsOwner = (isOwner && activeRole !== "digger") || isAdmin;
  /** In digger mode we show digger content (bid form, etc.); in gigger mode we hide it */
  const showDiggerContent = isDigger && (activeRole !== "gigger");
  /** User has both roles — show mode indicator to avoid confusion */
  const hasBothRoles = userRoles?.includes("digger") && userRoles?.includes("gigger");
  /** Bids stats for right sidebar (when owner) */
  const [bidStats, setBidStats] = useState<BidStats | null>(null);
  /** Bids filters (when owner) */
  const [bidFilters, setBidFilters] = useState<BidFilters>(defaultBidFilters);
  /** Bids sort order (when owner) */
  const [bidSortBy, setBidSortBy] = useState<BidSortOption>("lowest_price");
  /** Award response: accept/decline loading and decline dialog */
  const [acceptAwardLoading, setAcceptAwardLoading] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineLoading, setDeclineLoading] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { addToCart } = useCart();
  const { loading: stripeConnectLoading, canReceivePayments } = useStripeConnect();

  const handleUnlockLead = () => {
    if (!gig) return;
    addToCart({
      id: gig.id,
      title: gig.title,
      budget_min: gig.budget_min,
      budget_max: gig.budget_max,
      location: gig.location ?? "",
      description: gig.description ?? "",
      calculated_price_cents: (gig as { calculated_price_cents?: number | null }).calculated_price_cents ?? undefined,
    });
    setCartOpen(true);
  };

  const DESCRIPTION_PREVIEW_LENGTH = 280;
  const descriptionNeedsToggle = (gig?.description?.length ?? 0) > DESCRIPTION_PREVIEW_LENGTH;
  const descriptionDisplay = gig
    ? descriptionExpanded || !descriptionNeedsToggle
      ? gig.description
      : `${gig.description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}${gig.description.length > DESCRIPTION_PREVIEW_LENGTH ? "…" : ""}`
    : "";

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

  // Fetch client verification from auth for "About the client" (so Email/Social show correctly)
  useEffect(() => {
    if (!id || !gig?.id || isOwner || !gig.consumer_id) {
      setClientVerificationFromAuth(null);
      return;
    }
    setClientVerificationFromAuth(null);
    let cancelled = false;
    (async () => {
      try {
        const data = await invokeEdgeFunction<{ email_verified?: boolean; social_verified?: boolean }>(
          supabase,
          "get-client-verification",
          { body: { gigId: id } }
        );
        if (cancelled) return;
        if (data != null && (typeof data.email_verified === "boolean" || typeof data.social_verified === "boolean"))
          setClientVerificationFromAuth({
            email_verified: !!data.email_verified,
            social_verified: !!data.social_verified,
          });
      } catch {
        // ignore; fall back to profile columns only
      }
    })();
    return () => { cancelled = true; };
  }, [id, gig?.id, gig?.consumer_id, isOwner]);

  // After Gigger returns from Stripe: confirm session and mark Digger as hired (fallback if webhook didn't run)
  useEffect(() => {
    const depositPaid = searchParams.get("deposit_paid");
    const sessionId = searchParams.get("session_id");
    if (depositPaid !== "true" || !sessionId || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await invokeEdgeFunction<{ success?: boolean; alreadyCompleted?: boolean; digger_id?: string; error?: string }>(
          supabase,
          "confirm-deposit-session",
          { body: { session_id: sessionId } }
        );
        if (cancelled) return;
        if (result?.success) {
          await loadData();
          setSearchParams({}, { replace: true });
          if (!result.alreadyCompleted) {
            toast({ title: "Payment confirmed", description: "The professional has been awarded this gig." });
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("recent-conversations-refresh"));
            if (result.digger_id) dispatchRefetchGigChatMessages(id, result.digger_id);
          }
        } else if (result?.error) {
          toast({ title: "Could not confirm payment", description: result.error, variant: "destructive" });
        }
      } catch {
        if (!cancelled) {
          toast({ title: "Could not confirm payment", description: "Please refresh the page. If you paid, the hire will still complete.", variant: "destructive" });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id, searchParams, setSearchParams, toast]);

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
      if (!cancelled) setDiggerCanBid(true);
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

  // Auto-open floating chat for Digger when they're awarded, so they see the award message
  const awardedChatOpenedRef = useRef(false);
  useEffect(() => {
    if (!id || !diggerId || !gig?.consumer_id) return;
    if (gig.status !== "awarded" || gig.awarded_digger_id !== diggerId) return;
    if (awardedChatOpenedRef.current) return;
    awardedChatOpenedRef.current = true;
    const t = setTimeout(() => openFloatingChat(id, diggerId), 500);
    return () => clearTimeout(t);
  }, [id, diggerId, gig?.status, gig?.awarded_digger_id, gig?.consumer_id]);

  // When arriving with ?award=diggerId (from float chat Award button), scroll to bids and clear param after opening
  useEffect(() => {
    const awardDiggerId = searchParams.get("award");
    if (!awardDiggerId || !canViewAsOwner || !gig) return;
    const scrollToBids = () => {
      const el = document.getElementById("bids");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const t = setTimeout(scrollToBids, 300);
    const clearParam = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("award");
      setSearchParams(next, { replace: true });
    }, 1500);
    return () => {
      clearTimeout(t);
      clearTimeout(clearParam);
    };
  }, [searchParams.get("award"), canViewAsOwner, gig, searchParams, setSearchParams]);

  // Diggers can only message client after the client has sent a message first; stay in sync via realtime + messages sync event
  useEffect(() => {
    if (!id || !diggerId || !gig?.consumer_id) {
      setHasClientSentMessage(false);
      return;
    }
    const consumerId = gig.consumer_id;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const convIdRef = { current: null as string | null };

    const onSync = (e: Event) => {
      const { conversationId, message } = (e as CustomEvent<{ conversationId: string; message?: { sender_id: string } }>).detail ?? {};
      if (!conversationId || !message || message.sender_id !== consumerId) return;
      if (convIdRef.current === conversationId) {
        setHasClientSentMessage(true);
        return;
      }
      if (convIdRef.current === null) {
        supabase.from("conversations" as any).select("id").eq("id", conversationId).eq("gig_id", id).eq("digger_id", diggerId).eq("consumer_id", consumerId).maybeSingle().then(({ data }) => {
          if ((data as { id?: string } | null)?.id) setHasClientSentMessage(true);
        });
      }
    };
    window.addEventListener(MESSAGES_SYNC_EVENT, onSync);

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
        convIdRef.current = convId;
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
      convIdRef.current = null;
      window.removeEventListener(MESSAGES_SYNC_EVENT, onSync);
      if (channel) supabase.removeChannel(channel);
    };
  }, [id, diggerId, gig?.consumer_id]);

  // Realtime: gig updates (e.g. gigger awards → show "You're awarded" card without refresh)
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`gig-detail-gig:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "gigs", filter: `id=eq.${id}` },
        (payload: { new: Record<string, unknown> }) => {
          const next = payload.new as Partial<Gig>;
          setGig((prev) => (prev ? { ...prev, ...next } : (next as Gig)));
          if (next?.status === "awarded" && next?.awarded_digger_id && next.awarded_digger_id === diggerId && next?.awarded_bid_id) {
            setExistingBid((prev) =>
              prev && prev.id === next.awarded_bid_id ? { ...prev, awarded: true } : prev
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, diggerId]);

  const loadData = async () => {
    if (!id) return;

    // Wave 1: Fetch session and gig in parallel so we can show the page sooner
    const gigSelect = `
      id, consumer_id, title, description, budget_min, budget_max, project_type, hourly_rate_min, hourly_rate_max, estimated_hours_min, estimated_hours_max, timeline, location, work_type, category_id, requirements,
      preferred_regions, status, confirmation_status, is_confirmed_lead, confirmed_at, created_at, updated_at,
      purchase_count, calculated_price_cents, bumped_at, deadline, poster_country, skills_required,
      awarded_at, awarded_bid_id, awarded_digger_id,
      categories (name, description),
      profiles!gigs_consumer_id_fkey (full_name, avatar_url, country, state, city, timezone, created_at, email_verified, phone_verified, payment_verified, id_verified, social_verified),
      gig_skills (skills (name))
    `;
    const [sessionResult, gigResult] = await Promise.all([
      supabase.auth.getSession(),
      (supabase.from("gigs") as any).select(gigSelect).eq("id", id).single(),
    ]);

    const { data: { session } } = sessionResult;
    setCurrentUser(session?.user || null);

    const { data: gigData, error: gigError } = gigResult;
    if (gigError || !gigData) {
      toast({ title: "Gig not found", variant: "destructive" });
      navigate("/browse-gigs");
      return;
    }
    setGig(gigData as Gig);
    const isOwnerUser = session?.user?.id === gigData.consumer_id;
    setIsOwner(isOwnerUser);
    const userIsAdmin = userRoles?.includes("admin") ?? false;

    // Wave 2: Profile, owner contact, and client stats in parallel (only need session + gig)
    const profilePromise = session?.user
      ? supabase.from("profiles").select("user_type").eq("id", session.user.id).single()
      : Promise.resolve({ data: null });
    const ownerContactPromise = (isOwnerUser || userIsAdmin) && gigData.consumer_id
      ? supabase.from("gigs").select("client_name, consumer_email, consumer_phone").eq("id", id).single()
      : Promise.resolve({ data: null });
    const clientStatsPromise = gigData.consumer_id
      ? supabase.from("gigs").select("id, status, awarded_at").eq("consumer_id", gigData.consumer_id)
      : Promise.resolve({ data: [] });
    const clientSpentPromise = gigData.consumer_id
      ? supabase.from("escrow_contracts" as any).select("total_amount, status").eq("consumer_id", gigData.consumer_id)
      : Promise.resolve({ data: [] });

    const [profileRes, ownerContactRes, clientStatsRes, clientSpentRes] = await Promise.all([
      profilePromise,
      ownerContactPromise,
      clientStatsPromise,
      clientSpentPromise,
    ]);

    const profile = profileRes.data as { user_type?: string } | null;
    const userIsDigger = profile?.user_type === "digger" || (userRoles && userRoles.includes("digger"));
    setIsDigger(userIsDigger);
    if (!userIsDigger) setDiggerCanBid(false);

    if (ownerContactRes.data) {
      setGig((prev) => (prev ? { ...prev, ...ownerContactRes.data } : prev));
    }
    if (clientStatsRes.data && Array.isArray(clientStatsRes.data)) {
      const list = clientStatsRes.data as { status: string; awarded_at?: string | null }[];
      const open = list.filter((g) => g.status === "open").length;
      const active = list.filter((g) => g.status === "in_progress" || (g.awarded_at != null && g.status !== "completed")).length;
      const completedFromGigs = list.filter((g) => g.status === "completed").length;
      setClientGigStats({ open, active, completed: completedFromGigs, total: list.length });
    } else {
      setClientGigStats(null);
    }
    if (clientSpentRes.data && Array.isArray(clientSpentRes.data)) {
      const contracts = clientSpentRes.data as { total_amount: number; status: string }[];
      const completedContracts = contracts.filter((r) => r.status === "completed");
      const spent = completedContracts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
      setClientSpentBudget(spent > 0 ? spent : null);
      setClientCompletedContractsCount(completedContracts.length);
    } else {
      setClientSpentBudget(null);
      setClientCompletedContractsCount(null);
    }

    if (!userIsDigger) {
      setCanSeeBudget(true);
      setLoading(false);
      if (fbConfigured && gigData) {
        trackFBEvent("ViewContent", {
          content_name: gigData.title,
          content_ids: [gigData.id],
          content_type: "gig",
          value: gigData.budget_min || 0,
          currency: "USD",
        });
      }
      return;
    }

    // Wave 3: Digger-specific — get or create digger profile, then fetch bid/lead data in parallel
    let diggerProfileRow: { id: string } | null = null;
    const { data: existingProfile } = await supabase
      .from("digger_profiles" as any)
      .select("id")
      .eq("user_id", session!.user!.id)
      .maybeSingle();
    diggerProfileRow = existingProfile as unknown as { id: string } | null;

    if (!diggerProfileRow) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session!.user!.id)
        .single();
      const businessName = (profileRow as { full_name?: string } | null)?.full_name?.trim() || "My Business";
      const { data: created } = await supabase
        .from("digger_profiles" as any)
        .insert({
          user_id: session!.user!.id,
          business_name: businessName,
          location: "Not set",
          phone: "Not set",
        } as any)
        .select("id")
        .single();
      diggerProfileRow = created as unknown as { id: string } | null;
    }

    if (!diggerProfileRow) {
      setDiggerCanBid(false);
      setLoading(false);
      return;
    }

    setDiggerId(diggerProfileRow.id);
    setCanSeeBudget(true);

    const [bidRes, leadRes] = await Promise.all([
      supabase.from("bids" as any).select("*").eq("gig_id", id).eq("digger_id", diggerProfileRow!.id).maybeSingle(),
      supabase.from("lead_purchases").select("id").eq("gig_id", id).eq("digger_id", diggerProfileRow!.id).eq("status", "completed").maybeSingle(),
    ]);

    setDiggerCanBid(true);
    setExistingBid((bidRes.data as any) ?? null);
    setHasLeadPurchase(!!leadRes.data);

    setLoading(false);

    if (fbConfigured && gigData) {
      trackFBEvent("ViewContent", {
        content_name: gigData.title,
        content_ids: [gigData.id],
        content_type: "gig",
        value: gigData.budget_min || 0,
        currency: "USD",
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

  const formatGigPrice = (g: Gig): string => {
    if (g.project_type === "hourly") {
      const rMin = g.hourly_rate_min ?? 0;
      const rMax = g.hourly_rate_max ?? rMin;
      if (!rMin && !rMax) return "Rate not specified";
      if (rMin && rMax && rMin !== rMax) return `$${Math.round(rMin)}–${Math.round(rMax)}/hr`;
      return `$${Math.round(rMax || rMin)}/hr`;
    }
    return formatBudget(g.budget_min, g.budget_max);
  };

  /** For lead price display: budget range (fixed) or estimated total range (hourly). */
  const getLeadPriceBudget = () => {
    if (gig?.project_type === "hourly") {
      const r = ((gig.hourly_rate_min ?? 0) + ((gig.hourly_rate_max ?? gig.hourly_rate_min) ?? 0)) / 2;
      const h = ((gig.estimated_hours_min ?? 1) + ((gig.estimated_hours_max ?? gig.estimated_hours_min) ?? 1)) / 2;
      const est = r * Math.max(h, 1);
      return { min: Math.round(est * 0.8), max: Math.round(est * 1.2) };
    }
    return { min: gig?.budget_min ?? null, max: gig?.budget_max ?? null };
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
  const [cancelAwardLoading, setCancelAwardLoading] = useState(false);
  const [hasClientSentMessage, setHasClientSentMessage] = useState(false);
  const [editingProposal, setEditingProposal] = useState(false);
  const [clientGigStats, setClientGigStats] = useState<ClientGigStats | null>(null);
  /** Total amount client has spent on completed contracts (for "About the client" card) */
  const [clientSpentBudget, setClientSpentBudget] = useState<number | null>(null);
  /** Number of completed escrow contracts (for "About the client" card — accurate completed projects) */
  const [clientCompletedContractsCount, setClientCompletedContractsCount] = useState<number | null>(null);
  /** Verification from auth (email/social) for About the client when profile columns are not set */
  const [clientVerificationFromAuth, setClientVerificationFromAuth] = useState<{ email_verified: boolean; social_verified: boolean } | null>(null);
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

  /** Gigger cancels the award: refund deposit, gig back to open, bid no longer awarded. */
  const handleCancelAward = async () => {
    if (!id || !gig) return;
    if (!window.confirm("Cancel this award? Your deposit will be refunded and the gig will be open again for other proposals. The awarded professional will be notified.")) return;
    setCancelAwardLoading(true);
    try {
      const data = await invokeEdgeFunction<{ success?: boolean; message?: string; refunded?: boolean }>(
        supabase,
        "gigger-cancel-award",
        { body: { gigId: id } }
      );
      if (data?.success) {
        toast({
          title: "Award cancelled",
          description: data?.refunded ? "Your deposit has been refunded. The gig is open again." : data?.message ?? "The gig is open again.",
        });
        loadData();
      }
    } catch (e: any) {
      toast({ title: "Failed to cancel award", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setCancelAwardLoading(false);
    }
  };

  /** Digger accepts the award: bid → accepted, gig → in_progress, fee/deposit logic runs, Gigger notified. */
  const handleAcceptAward = async () => {
    if (!id || !gig || !diggerId || !existingBid?.id) return;
    setAcceptAwardLoading(true);
    try {
      const data = await invokeEdgeFunction<{
        success?: boolean;
        alreadyAccepted?: boolean;
        requiresPayment?: boolean;
        checkoutUrl?: string;
        message?: string;
      }>(supabase, "digger-accept-award", {
        body: { bidId: existingBid.id, gigId: id, diggerId },
      });
      if (data?.requiresPayment && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data?.success || data?.alreadyAccepted) {
        toast({
          title: data?.alreadyAccepted ? "Already accepted" : "You accepted the job!",
          description: "The client has been notified. You or they can set up the payment contract (milestones) next.",
        });
        setExistingBid((prev) => (prev ? { ...prev, status: "accepted" } : null));
        setGig((prev) => (prev ? { ...prev, status: "in_progress" } : null));
        dispatchAwardAccepted(id, existingBid.id);
        loadData();
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to accept the award.",
        variant: "destructive",
      });
    } finally {
      setAcceptAwardLoading(false);
    }
  };

  /** Digger declines: release award; Gigger is refunded and Digger is charged $100 penalty. */
  const handleDeclineAward = async () => {
    if (!id || !diggerId || !existingBid?.id) return;
    setDeclineLoading(true);
    try {
      const data = await invokeEdgeFunction<{ success?: boolean; refunded?: boolean; penaltyCharged?: boolean }>(
        supabase,
        "digger-decline-award",
        {
          body: {
            bidId: existingBid.id,
            gigId: id,
            diggerId,
            reason: declineReason.trim() || undefined,
          },
        }
      );
      toast({
        title: "Award declined",
        description: data?.refunded
          ? "The client will get their deposit back. You have been charged a $100 penalty. You can still browse and bid on other gigs."
          : "The client can award another bid. You can still browse and bid on other gigs.",
      });
      setDeclineDialogOpen(false);
      setDeclineReason("");
      setGig((prev) =>
        prev
          ? { ...prev, status: "open", awarded_at: null, awarded_bid_id: null, awarded_digger_id: null }
          : null
      );
      setExistingBid((prev) => (prev ? { ...prev, awarded: false } : null));
      loadData();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to decline.",
        variant: "destructive",
      });
    } finally {
      setDeclineLoading(false);
    }
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
      <div className="min-h-screen bg-background">
        <main className="w-full min-w-0 max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 box-border">
          <div className="grid lg:grid-cols-10 gap-4 sm:gap-6 lg:gap-8 min-w-0" aria-busy="true" aria-label="Loading gig">
            <div className="lg:col-span-8 space-y-4 sm:space-y-6 lg:space-y-6 min-w-0">
              <Card className="border border-border rounded-lg shadow-none">
                <CardHeader className="p-4 sm:p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-14 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <Skeleton className="h-8 w-[85%] max-w-[28ch] rounded" />
                    <Skeleton className="h-7 w-24 rounded shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 md:p-6 pt-0 space-y-4 sm:space-y-6">
                  <div>
                    <Skeleton className="h-5 w-24 rounded mb-2" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded mt-2" />
                    <Skeleton className="h-4 max-w-[90%] w-full rounded mt-2" />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-2 rounded-lg bg-muted/30 px-3 sm:px-4 py-2.5 sm:py-3 border border-border/50">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-28 rounded" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16 rounded-lg" />
                    <Skeleton className="h-6 w-20 rounded-lg" />
                    <Skeleton className="h-6 w-14 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <aside className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
              <Card className="border border-border rounded-lg shadow-none p-4 sm:p-5">
                <Skeleton className="h-5 w-32 rounded mb-3" />
                <Skeleton className="h-4 w-full rounded mb-2" />
                <Skeleton className="h-10 w-full rounded-md mt-4" />
              </Card>
              <Card className="border border-border rounded-lg shadow-none p-4 sm:p-5">
                <Skeleton className="h-5 w-28 rounded mb-3" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 max-w-[80%] w-full rounded mt-2" />
              </Card>
            </aside>
          </div>
        </main>
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
        description={`${gig.description.substring(0, 150)}... Budget: ${budgetText}. Posted ${formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}. Bid or unlock lead. Digs & Gigs — for Diggers (freelancers) and Giggers (clients).`}
        keywords={`${gig.title}, ${gig.location}, gig, hire freelancer, Digger, Gigger, ${gig.categories?.name || 'services'}${getGigSkillNames(gig).length ? `, ${getGigSkillNames(gig).join(', ')}` : ''}`}
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

      <main className="w-full min-w-0 max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 box-border">
        <div className="grid lg:grid-cols-10 gap-4 sm:gap-6 lg:gap-8 min-w-0">
          <div className="lg:col-span-8 space-y-4 sm:space-y-6 lg:space-y-6 min-w-0">
            <Card className="border border-border rounded-lg shadow-none hover:border-primary/20 transition-colors overflow-hidden">
              <CardHeader className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={cn(
                    "text-xs font-normal",
                    gig.status === "open" && "text-primary",
                    gig.status === "in_progress" && "text-blue-600 dark:text-blue-400",
                    gig.status === "completed" && "text-green-700 dark:text-green-600",
                    gig.status === "awarded" && "text-green-500 dark:text-green-400",
                    (gig.status === "pending_confirmation" || gig.status === "pending") && "text-gray-500 dark:text-gray-400",
                    !["open", "completed", "in_progress", "awarded", "pending", "pending_confirmation"].includes(gig.status) && "text-gray-500 dark:text-gray-400"
                  )}>
                    {gig.status === "completed" ? "Completed" : gig.status === "in_progress" ? "In progress" : gig.status === "awarded" ? "Awarded" : gig.status === "open" ? "Open" : gig.status}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Posted {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-3 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl font-semibold break-words min-w-0 flex-1">{gig.title}</CardTitle>
                  {canSeeBudget && (gig.project_type === "hourly" ? (gig.hourly_rate_min != null || gig.hourly_rate_max != null) : (gig.budget_min != null || gig.budget_max != null)) && (
                    <span className="text-lg sm:text-xl font-semibold text-primary shrink-0 flex items-center gap-2">
                      {formatGigPrice(gig)}
                      {gig.project_type === "hourly" && (
                        <span className="text-xs text-muted-foreground">Hourly</span>
                      )}
                    </span>
                  )}
                  {showDiggerContent && !canSeeBudget && (
                    <span className="text-sm text-muted-foreground shrink-0">Submit a bid to view budget</span>
                  )}
                </div>
                {gig.status === "completed" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    This job is completed. Payment & milestones and reviews are below.
                  </p>
                )}
                {canViewAsOwner && (
                  <div className="flex flex-wrap gap-2 gap-y-2 mt-4 pt-2 border-t border-border">
                    {isAdmin && (
                      <span className="text-xs text-muted-foreground">Viewing as admin</span>
                    )}
                    {isOwner && gig.status === "awarded" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelAward}
                        disabled={cancelAwardLoading}
                        className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 min-h-[44px] sm:min-h-0"
                        title="Cancel the award and reopen the gig; your deposit will be refunded"
                      >
                        {cancelAwardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                        Cancel award
                      </Button>
                    )}
                    {isOwner && gig.status === "open" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBump}
                        disabled={bumping}
                        className="min-h-[44px] sm:min-h-0"
                        title="Bump this listing to the top so more diggers see it"
                      >
                        {bumping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                        Bump listing
                      </Button>
                    )}
                    {isOwner && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRepost}
                          disabled={reposting || !gig.consumer_id}
                          className="min-h-[44px] sm:min-h-0"
                          title="Create a new listing with the same details"
                        >
                          {reposting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
                          Repost
                        </Button>
                        {gig.status !== "completed" && (
                          <Button variant="outline" size="sm" className="gap-2 min-h-[44px] sm:min-h-0" onClick={() => navigate(`/gig/${id}/edit`)} title="Edit gig details">
                            <Pencil className="h-4 w-4" />
                            Edit gig
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="gap-2 min-h-[44px] sm:min-h-0" onClick={() => navigate("/my-gigs")}>
                            <FolderOpen className="h-4 w-4" />
                            Manage in My Gigs
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveGig}
                          disabled={removing || gig.status !== "open"}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] sm:min-h-0"
                          title="Close and remove this gig"
                        >
                          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                          Remove gig
                        </Button>
                  </>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 sm:p-5 md:p-6 pt-0 space-y-4 sm:space-y-6">
                <div>
                  <h3 className="font-semibold text-base sm:text-lg mb-2">Description</h3>
                  <p className="text-muted-foreground text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{descriptionDisplay}</p>
                  {descriptionNeedsToggle && (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-primary mt-1 font-medium"
                      onClick={() => setDescriptionExpanded((e) => !e)}
                    >
                      {descriptionExpanded ? "View less" : "View more"}
                    </Button>
                  )}
                </div>

                {/* At-a-glance: job type, preferred location, deadline (no category tag, no budget here, no client flag) */}
                <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground rounded-lg bg-muted/30 sm:bg-muted/40 px-3 sm:px-4 py-2.5 sm:py-3 border border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {gig.work_type === "remote"
                        ? "Remote"
                        : gig.work_type === "hybrid"
                          ? "Hybrid"
                          : gig.work_type === "onsite"
                            ? "On-site"
                            : gig.work_type === "flexible"
                              ? "Flexible"
                              : gig.location || "Remote"}
                    </span>
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

            {/* Payout reminder for Diggers: connect Stripe to receive money when awarded or hired */}
            {showDiggerContent && diggerId && !stripeConnectLoading && !canReceivePayments && (
              <StripeConnectBanner />
            )}

            {/* Withdrawn: cannot bid again, edit, or chat */}
            {showDiggerContent && diggerId && existingBid && (existingBid.status === "withdrawn" || existingBid.withdrawn_at) && (
              <Card id="bid" className="border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-none">
                <CardContent className="p-4 sm:p-6 pt-6">
                  <p className="text-center text-muted-foreground text-sm sm:text-base">
                    You withdrew from this gig. You cannot place a new bid, edit your proposal, or message the client for this gig. Other diggers can still bid.
                  </p>
                </CardContent>
              </Card>
            )}
            {/* Submit or edit proposal — enabled for any digger profile; never if digger has withdrawn */}
            {showDiggerContent && diggerId && diggerCanBid && gig.status === 'open' && !existingBid && (
              <div id="bid">
                <BidSubmissionTemplate
                  gigId={id!}
                  diggerId={diggerId}
                  projectType={gig.project_type ?? "fixed"}
                  leadPriceBudgetMin={getLeadPriceBudget().min ?? undefined}
                  leadPriceBudgetMax={getLeadPriceBudget().max ?? undefined}
                  leadPriceCalculatedCents={(gig as { calculated_price_cents?: number | null }).calculated_price_cents}
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
                  onBuyLeadClick={handleUnlockLead}
                  onExclusiveClick={() => document.getElementById("bid")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                />
              </div>
            )}
            {showDiggerContent && diggerId && gig.status === 'open' && existingBid && !(existingBid.status === "withdrawn" || existingBid.withdrawn_at) && editingProposal && (
              <div id="bid">
                <BidSubmissionTemplate
                  gigId={id!}
                  diggerId={diggerId}
                  projectType={gig.project_type ?? "fixed"}
                  leadPriceBudgetMin={getLeadPriceBudget().min ?? undefined}
                  leadPriceBudgetMax={getLeadPriceBudget().max ?? undefined}
                  leadPriceCalculatedCents={(gig as { calculated_price_cents?: number | null }).calculated_price_cents}
                  existingBid={{
                    id: existingBid.id,
                    proposal: existingBid.proposal || "",
                    amount: existingBid.amount ?? (existingBid.amount_min != null && existingBid.amount_max != null
                      ? (existingBid.amount_min + existingBid.amount_max) / 2
                      : existingBid.amount_min ?? existingBid.amount_max ?? 0),
                    amount_min: existingBid.amount_min ?? undefined,
                    amount_max: existingBid.amount_max ?? undefined,
                    timeline: existingBid.timeline || "",
                    payment_terms: existingBid.payment_terms ?? undefined,
                    milestones: existingBid.milestones ?? undefined,
                    accepted_payment_methods: existingBid.accepted_payment_methods ?? undefined,
                    pricing_model: existingBid.pricing_model === "success_based" || existingBid.pricing_model === "pay_per_lead" ? existingBid.pricing_model : undefined,
                  }}
                  onSuccess={() => {
                    setEditingProposal(false);
                    loadData();
                    toast({ title: "Proposal updated", description: "Your changes have been saved." });
                    setTimeout(() => document.getElementById("bid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                  }}
                  onBuyLeadClick={handleUnlockLead}
                  onExclusiveClick={() => document.getElementById("bid")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                />
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setEditingProposal(false)}>
                  Cancel
                </Button>
              </div>
            )}
            {/* Digger: Awarded – must accept within 24h or $100 penalty; decline = $100 penalty */}
            {showDiggerContent &&
              diggerId &&
              gig?.status === "awarded" &&
              gig.awarded_digger_id === diggerId &&
              existingBid?.awarded &&
              existingBid?.status !== "accepted" && (
                <Card id="award-response" className="border border-primary/20 rounded-lg bg-muted/20 shadow-none">
                  <CardHeader className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Award className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg sm:text-xl">You&apos;re awarded</CardTitle>
                        <CardDescription className="mt-1 space-y-1 text-sm">
                          <span className="block">The client awarded you this gig. Accept within 24 hours or you&apos;ll be charged a $100 penalty (same if you decline). If you decline, the client gets their deposit back.</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 pt-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button
                      onClick={handleAcceptAward}
                      disabled={acceptAwardLoading}
                      className="gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                    >
                      {acceptAwardLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept award"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDeclineDialogOpen(true)}
                      disabled={acceptAwardLoading || declineLoading}
                      className="gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                    >
                      Decline
                    </Button>
                  </CardContent>
                </Card>
              )}
            {/* Digger: Already accepted – You're hired; cannot decline or cancel */}
            {showDiggerContent &&
              diggerId &&
              gig?.status === "in_progress" &&
              gig.awarded_digger_id === diggerId &&
              existingBid?.awarded && existingBid?.status === "accepted" && (
                <Card id="award-response" className="border border-green-200/60 dark:border-green-800/50 rounded-lg bg-green-50 dark:bg-green-950/30 shadow-none">
                  <CardHeader className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                        <Award className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg sm:text-xl text-green-900 dark:text-green-100">You&apos;re hired for this gig</CardTitle>
                        <CardDescription className="mt-1 space-y-1 text-sm text-green-800/90 dark:text-green-200/90">
                          <span className="block">You accepted the award. You or the client can set up the payment contract (milestones) next.</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )}
            <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Decline this job?</DialogTitle>
                  <DialogDescription>
                    The award will be released and the client can choose someone else. If they paid a 15% deposit, they get a full refund. If you decline, you will be charged a $100 penalty. You can optionally give a short reason.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Reason (optional)"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="min-h-[80px] resize-y"
                  maxLength={500}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeclineDialogOpen(false)} disabled={declineLoading}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeclineAward} disabled={declineLoading}>
                    {declineLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Declining...
                      </>
                    ) : (
                      "Decline award"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {activeRole === 'gigger' && !isOwner && currentUser && gig.status === 'open' && (
              <Card id="bid" className="border border-border rounded-lg shadow-none">
                <CardContent className="p-4 sm:p-6 pt-6 space-y-4">
                  <p className="text-center text-muted-foreground text-sm sm:text-base">
                    You’re viewing as a <strong>Gigger</strong>. Post your own gig to receive bids from Diggers.
                  </p>
                  <Button className="w-full min-h-[44px]" variant="outline" onClick={() => navigate('/post-gig')}>
                    Post a gig
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Have a Digger account? Switch to Digger mode in the nav to bid on this gig.
                  </p>
                </CardContent>
              </Card>
            )}
            {currentUser && (!isDigger || !diggerId) && !isOwner && gig.status === 'open' && !userRoles?.includes('digger') && activeRole !== 'gigger' && (
              <Card id="bid" className="border border-border rounded-lg shadow-none">
                <CardContent className="p-4 sm:p-6 pt-6">
                  <p className="text-center text-muted-foreground text-sm sm:text-base">
                    Only <strong>Diggers</strong> can bid on gigs. Switch to Digger to bid, or post your own gigs as a Gigger.
                  </p>
                </CardContent>
              </Card>
            )}
            {currentUser && (!isDigger || !diggerId) && !isOwner && gig.status === 'open' && userRoles?.includes('digger') && activeRole !== 'gigger' && (
              <Card id="bid" className="border border-border rounded-lg shadow-none">
                <CardContent className="p-4 sm:p-6 pt-6 space-y-4">
                  <p className="text-center text-muted-foreground text-sm sm:text-base">
                    To place a bid you need an active <strong>Digger</strong> profile.
                  </p>
                  <Button className="w-full min-h-[44px]" onClick={() => navigate('/role-dashboard')}>
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
            {!currentUser && !isOwner && gig.status === 'open' && (
              <Card id="bid" className="border border-border rounded-lg shadow-none">
                <CardContent className="p-4 sm:p-6 pt-6">
                  <p className="text-center text-muted-foreground text-sm sm:text-base mb-4">Want to bid on this gig?</p>
                  <Button className="w-full min-h-[44px]" onClick={() => navigateToSignUp({ type: "digger" })}>
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

            {/* Bids Section: owner/admin sees full list; digger sees header + stats only (no bid cards) */}
            {(canViewAsOwner || showDiggerContent) && (
              <div id="bids">
              <BidsList
                gigId={id!}
                gigTitle={gig.title}
                isOwner={canViewAsOwner}
                openAwardForDiggerId={searchParams.get("award") || undefined}
                isFixedPrice={gig.project_type !== "hourly"}
                currentDiggerId={diggerId}
                currentUserId={currentUser?.id}
                filterState={bidFilters}
                onFilterChange={setBidFilters}
                onStats={setBidStats}
                statsInSidebar={canViewAsOwner}
                sortBy={bidSortBy}
                onClearFilters={() => setBidFilters(defaultBidFilters)}
                onAwardSuccess={loadData}
                gigStatus={gig?.status}
                awardedBidId={gig?.awarded_bid_id ?? null}
                onCancelAward={handleCancelAward}
                cancelAwardLoading={cancelAwardLoading}
                onEditProposal={
                  existingBid && showDiggerContent && gig?.status === "open" && !(existingBid?.status === "accepted" && existingBid?.awarded) && !(existingBid?.status === "withdrawn" || existingBid?.withdrawn_at)
                    ? () => setEditingProposal(true)
                    : undefined
                }
                onMessageClient={existingBid && showDiggerContent && !(existingBid?.status === "withdrawn" || existingBid?.withdrawn_at) ? handleSendMessage : undefined}
                canMessageClient={!!(hasClientSentMessage || gig?.awarded_digger_id === diggerId)}
                messageClientTooltip={
                  gig?.awarded_digger_id === diggerId
                    ? "Open conversation with the Gigger"
                    : hasClientSentMessage
                      ? "Open conversation with the Gigger"
                      : "You can reply after the Gigger sends you a message first"
                }
                showPaymentAndMilestones={!(isOwner && activeRole === "digger")}
              />
              </div>
            )}
          </div>

          {/* Right sidebar (2 cols, 8:2 with main): for owner = bids stats + filters; for Diggers = Contact client + client info */}
          <aside className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-6 lg:sticky lg:top-24 lg:self-start min-w-0">
            {/* Contact the client now — in sidebar for non-owners who have not yet purchased the lead */}
            {isOwner && activeRole === "digger" && (
              <Card className="border border-border rounded-lg shadow-none border-accent/30 bg-accent/5 overflow-hidden">
                <CardHeader className="p-4 sm:p-5">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
                    <span className="min-w-0 break-words">Manage this gig</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    You own this gig. Switch to Gigger mode to view bids, award a Digger, edit, or manage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0">
                  <Button
                    variant="default"
                    className="w-full gap-2 bg-accent hover:bg-accent/90 min-h-[44px]"
                    onClick={() => switchRole("gigger")}
                  >
                    <Briefcase className="h-4 w-4" />
                    Switch to Gigger mode
                  </Button>
                </CardContent>
              </Card>
            )}
            {/* Contact the client — always visible for awarded digger once awarded / in progress / completed */}
            {!isOwner && showDiggerContent && diggerId && gig?.awarded_digger_id === diggerId && ["awarded", "in_progress", "completed"].includes(gig?.status ?? "") && (
              <Card className="border border-border rounded-lg shadow-none border-accent/30 bg-accent/5 overflow-hidden">
                <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Contact the client</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Open the conversation with the Gigger to coordinate or follow up.
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 w-full min-h-[44px] sm:min-h-9"
                    onClick={() => id && openFloatingChat(id, diggerId)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Open conversation
                  </Button>
                </CardContent>
              </Card>
            )}
            {!hasLeadPurchase && !isOwner && gig?.status === "open" && (
              <Card className="border border-border rounded-lg shadow-none bg-card overflow-hidden">
                <CardContent className="p-4 flex flex-col gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Contact the client</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      One-time payment. Secure. Get contact details to reach out directly.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                      {getLeadPriceDisplay(
                        getLeadPriceBudget().min,
                        getLeadPriceBudget().max,
                        (gig as { calculated_price_cents?: number | null }).calculated_price_cents
                      ).label}
                    </span>
                    <Button onClick={handleUnlockLead} size="sm" className="gap-1.5 w-full sm:w-auto shrink-0 min-h-[44px] sm:min-h-9 sm:h-9">
                      <Unlock className="h-3.5 w-3.5" />
                      Unlock contact
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">{LEAD_PRICE_CAPTION}</p>
                </CardContent>
              </Card>
            )}
            {!isOwner && gig?.status === "open" && (showDiggerContent || !canViewAsOwner) && (
              <Card className="border border-border rounded-lg shadow-none bg-card overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500 shrink-0" />
                    No fee from your pocket
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Gigger awards</span> → Gigger pays a 15% deposit (charged to their card).</p>
                  <p><span className="font-medium text-foreground">Digger accepts</span> → The 8% referral fee is taken from that deposit: the platform keeps 8%, the rest is released to you. You are not charged anything.</p>
                  <p><span className="font-medium text-foreground">First milestone approved</span> → 7% is added to you from that deposit when you complete the first milestone (no extra charge to you).</p>
                </CardContent>
              </Card>
            )}
            {canViewAsOwner && (
              <>
                {/* Filters */}
                <Card className="border border-border rounded-lg shadow-none bg-card overflow-hidden min-w-0">
                  <CardHeader className="p-4 sm:p-5 pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2 min-w-0">
                      <Filter className="h-4 w-4 text-primary shrink-0" />
                      Filter Diggers
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Narrow bids by proposal, price, timeline, rating, or location.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bid-filter-search" className="text-xs">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="bid-filter-search"
                          placeholder="Name, @handle, proposal, location..."
                          value={bidFilters.search}
                          onChange={(e) => setBidFilters((f) => ({ ...f, search: e.target.value }))}
                          className="pl-8 h-9 min-h-[44px] sm:min-h-9 text-sm"
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
                          className="h-9 min-h-[44px] sm:min-h-9 text-sm"
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
                          className="h-9 min-h-[44px] sm:min-h-9 text-sm"
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
                        className="h-9 min-h-[44px] sm:min-h-9 text-sm"
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
                        className="h-9 min-h-[44px] sm:min-h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bid-filter-location" className="text-xs">Location</Label>
                      <Input
                        id="bid-filter-location"
                        placeholder="Country, state, or city"
                        value={bidFilters.location}
                        onChange={(e) => setBidFilters((f) => ({ ...f, location: e.target.value }))}
                        className="h-9 min-h-[44px] sm:min-h-9 text-sm"
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
            {!isOwner && activeRole !== "gigger" && (() => {
              // Normalize profile: Supabase can return relation as object or array; support both and snake_case from API
              const raw = (gig as any).profiles;
              const clientProfile = raw == null ? null : Array.isArray(raw) ? raw[0] : raw;
              const p = clientProfile || gig.profiles || null;
              const clientLocalTime = formatClientLocalTime(p?.timezone ?? null) ||
                (p?.country ?? gig.poster_country ? getLocalTimeForLocation(p?.country ?? gig.poster_country ?? "", p?.state ?? null) : null);
              return (
              <Card className="border border-border rounded-lg shadow-none bg-muted/20 overflow-hidden min-w-0">
                <CardHeader className="p-3 sm:p-4 pb-1">
                  <CardTitle className="text-sm font-medium">
                    About the client
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
                  {/* Photo + name + location in one compact block */}
                  {(p?.avatar_url || p?.full_name || gig.client_name) && (
                    <div className="flex items-center gap-2.5">
                      {p?.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover shrink-0"
                          width={36}
                          height={36}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {p?.full_name?.trim() || gig.client_name?.trim() || "Client"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {(() => {
                            const parts = [p?.city, p?.state, p?.country ?? gig.poster_country].filter((s) => s?.trim());
                            const fullLocation = parts.length > 0 ? parts.join(", ") : null;
                            const country = p?.country ?? gig.poster_country ?? null;
                            const code = country ? getCodeForCountryName(country) : "";
                            if (fullLocation) return <span className="truncate">{fullLocation}</span>;
                            if (country) return <span>{code ? `${code} · ${country}` : country}</span>;
                            return <span>Not specified</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Local time — always show row so it's visible */}
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" aria-hidden />
                      <span>Local time: </span>
                      <span>{clientLocalTime ? `${clientLocalTime} local` : "—"}</span>
                    </span>
                    {p?.created_at && (
                      <span>Joined {format(new Date(p.created_at), "MMM yyyy")}</span>
                    )}
                  </div>
                  {/* Verification: green when verified */}
                  {(() => {
                    const emailVerified = p?.email_verified ?? clientVerificationFromAuth?.email_verified ?? false;
                    const socialVerified = p?.social_verified ?? clientVerificationFromAuth?.social_verified ?? false;
                    const phoneVerified = p?.phone_verified ?? false;
                    const paymentVerified = p?.payment_verified ?? false;
                    const idVerified = p?.id_verified ?? false;
                    const hasAny = emailVerified || phoneVerified || paymentVerified || idVerified || socialVerified;
                    const verifiedBadgeClass = "text-[10px] px-1.5 py-0 gap-0.5 bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border-0";
                    return hasAny ? (
                      <div className="flex flex-wrap gap-1.5">
                        {emailVerified && <Badge variant="secondary" className={verifiedBadgeClass}><Mail className="h-2.5 w-2.5" /> Email</Badge>}
                        {phoneVerified && <Badge variant="secondary" className={verifiedBadgeClass}><Phone className="h-2.5 w-2.5" /> Phone</Badge>}
                        {paymentVerified && <Badge variant="secondary" className={verifiedBadgeClass}><CreditCard className="h-2.5 w-2.5" /> Pay</Badge>}
                        {idVerified && <Badge variant="secondary" className={verifiedBadgeClass}><IdCard className="h-2.5 w-2.5" /> ID</Badge>}
                        {socialVerified && <Badge variant="secondary" className={verifiedBadgeClass}><Share2 className="h-2.5 w-2.5" /> Social</Badge>}
                      </div>
                    ) : null;
                  })()}
                  {/* Spent + projects on one line when present */}
                  {(clientSpentBudget != null && clientSpentBudget > 0) || (clientGigStats && clientGigStats.total >= 0) ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {clientSpentBudget != null && clientSpentBudget > 0 && (
                        <span className="font-medium text-primary">${clientSpentBudget.toLocaleString()} spent</span>
                      )}
                      {clientGigStats && clientGigStats.total >= 0 && (
                        <span className="text-muted-foreground">
                          {clientGigStats.open} open · {(clientCompletedContractsCount ?? clientGigStats.completed)} completed
                        </span>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );})()}

          </aside>
        </div>
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default GigDetail;
