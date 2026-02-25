import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CompleteWorkDialog } from "@/components/CompleteWorkDialog";
import { PaymentContractDialog } from "@/components/PaymentContractDialog";
import { SuggestMilestonePlanDialog } from "@/components/SuggestMilestonePlanDialog";
import { ContractMilestonesCard } from "@/components/ContractMilestonesCard";
import { ConfirmHireDialog } from "@/components/ConfirmHireDialog";
import { AnonymizedBidCard } from "@/components/AnonymizedBidCard";
import { DiggerProposalCard } from "@/components/DiggerProposalCard";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";
import { X, CreditCard, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface BidFilters {
  search: string;
  priceMin: string;
  priceMax: string;
  timeline: string;
  minRating: string;
  location: string;
  verifiedOnly: boolean;
}

export const defaultBidFilters: BidFilters = {
  search: "",
  priceMin: "",
  priceMax: "",
  timeline: "",
  minRating: "",
  location: "",
  verifiedOnly: false,
};

export interface BidStats {
  totalBids: number;
  totalUnfiltered: number;
  avgPrice: number;
  lowestAmount: number;
  highestAmount: number;
}

export type BidSortOption = "lowest_price" | "highest_price" | "newest" | "rating";

export const BID_SORT_OPTIONS: { value: BidSortOption; label: string }[] = [
  { value: "lowest_price", label: "Lowest price" },
  { value: "highest_price", label: "Highest price" },
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Highest rating" },
];

const PINNED_BIDS_STORAGE_KEY = "gig-pinned-bids";

function getPinnedBidIdsForGig(gigId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${PINNED_BIDS_STORAGE_KEY}-${gigId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((id: unknown) => typeof id === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function setPinnedBidIdsForGig(gigId: string, bidIds: string[]) {
  try {
    localStorage.setItem(`${PINNED_BIDS_STORAGE_KEY}-${gigId}`, JSON.stringify(bidIds));
  } catch {
    // ignore
  }
}

interface Bid {
  id: string;
  amount: number;
  amount_min?: number;
  amount_max?: number;
  timeline: string;
  proposal: string;
  status: string;
  created_at: string;
  awarded: boolean;
  awarded_at: string | null;
  pricing_model?: string;
  digger_profiles: {
    id: string;
    handle: string | null;
    business_name?: string;
    profession: string;
    profile_image_url: string | null;
    profiles?: { full_name: string | null; avatar_url?: string | null } | null;
    average_rating: number | null;
    total_ratings: number | null;
    years_experience?: number;
    completion_rate?: number;
    response_time_hours?: number;
    verified?: boolean;
    is_insured?: boolean;
    is_bonded?: boolean;
    is_licensed?: string;
    skills?: string[];
    certifications?: string[];
    city?: string;
    state?: string;
    country?: string | null;
    custom_occupation_title?: string | null;
    profile_name?: string | null;
    offers_free_estimates?: boolean;
    profiles?: { full_name: string | null } | null;
  };
  reference_count?: number;
}

function applyBidFilters(bids: Bid[], filters: BidFilters): Bid[] {
  return bids.filter((b) => {
    const search = (filters.search || "").trim().toLowerCase();
    if (search) {
      const proposal = (b.proposal || "").toLowerCase();
      const name = (b.digger_profiles?.profiles?.full_name || "").toLowerCase();
      const headline =
        [b.digger_profiles?.custom_occupation_title, b.digger_profiles?.profile_name, b.digger_profiles?.profession]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
      const handle = (b.digger_profiles?.handle || "").toLowerCase();
      const location = [b.digger_profiles?.city, b.digger_profiles?.state, b.digger_profiles?.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const match =
        proposal.includes(search) ||
        name.includes(search) ||
        headline.includes(search) ||
        handle.includes(search.replace(/^@/, "")) ||
        location.includes(search);
      if (!match) return false;
    }
    const priceMin = filters.priceMin.trim() ? parseFloat(filters.priceMin) : null;
    const priceMax = filters.priceMax.trim() ? parseFloat(filters.priceMax) : null;
    if (priceMin != null && !isNaN(priceMin)) {
      const bidMax = b.amount_max ?? b.amount;
      if (bidMax < priceMin) return false;
    }
    if (priceMax != null && !isNaN(priceMax)) {
      const bidMin = b.amount_min ?? b.amount;
      if (bidMin > priceMax) return false;
    }
    if ((filters.timeline || "").trim()) {
      const t = (b.timeline || "").toLowerCase();
      if (!t.includes(filters.timeline.trim().toLowerCase())) return false;
    }
    const minRating = filters.minRating.trim() ? parseFloat(filters.minRating) : null;
    if (minRating != null && !isNaN(minRating)) {
      const r = b.digger_profiles?.average_rating ?? 0;
      if (r < minRating) return false;
    }
    const loc = (filters.location || "").trim().toLowerCase();
    if (loc) {
      const diggerLoc = [b.digger_profiles?.city, b.digger_profiles?.state, b.digger_profiles?.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!diggerLoc.includes(loc)) return false;
    }
    if (filters.verifiedOnly && !b.digger_profiles?.verified) return false;
    return true;
  });
}

interface BidsListProps {
  gigId: string;
  gigTitle: string;
  isOwner: boolean;
  isFixedPrice?: boolean;
  /** When viewer is a digger (not owner), pass their digger profile id so only their bid(s) are shown. */
  currentDiggerId?: string | null;
  /** For Gigger: filter state (owned by parent so sidebar can show filters). */
  filterState?: BidFilters;
  onFilterChange?: (filters: BidFilters) => void;
  /** For Gigger: report stats for the right sidebar (filtered list). */
  onStats?: (stats: BidStats) => void;
  /** When true and isOwner, do not render the stats row (stats go in sidebar). */
  statsInSidebar?: boolean;
  /** Sort order for displayed bids (owner only). */
  sortBy?: BidSortOption;
  /** Callback when filters are cleared (e.g. from empty state). */
  onClearFilters?: () => void;
  /** Current user id (for payment contract / milestones). */
  currentUserId?: string | null;
  /** Called after Gigger awards a bid so parent can refetch gig (e.g. status → 'awarded'). */
  onAwardSuccess?: () => void;
  /** Gig status so ContractMilestonesCard can hide when status is 'awarded' (Digger sees Accept/Decline on page). */
  gigStatus?: string | null;
  /** Called when Gigger cancels the award from the proposal list; parent should refetch. */
  onCancelAward?: () => void | Promise<void>;
  /** When true, show loading state on Cancel award button (e.g. while parent is calling edge function). */
  cancelAwardLoading?: boolean;
  /** Digger viewing own bid: callback to switch to edit mode. */
  onEditProposal?: () => void;
  /** Digger viewing own bid: callback to open message with client. */
  onMessageClient?: () => void;
  /** Digger viewing own bid: whether they can message (client messaged first or digger is awarded). */
  canMessageClient?: boolean;
  /** Digger viewing own bid: tooltip for Chat button when disabled. */
  messageClientTooltip?: string;
}

export const BidsList = ({
  gigId,
  gigTitle,
  isOwner,
  isFixedPrice = false,
  currentDiggerId,
  filterState = defaultBidFilters,
  onFilterChange,
  onStats,
  statsInSidebar = false,
  sortBy = "lowest_price",
  onClearFilters,
  currentUserId,
  onAwardSuccess,
  gigStatus,
  onCancelAward,
  cancelAwardLoading = false,
  onEditProposal,
  onMessageClient,
  canMessageClient = false,
  messageClientTooltip,
}: BidsListProps) => {
  const { toast } = useToast();
  const { onlineDiggers } = useDiggerPresence();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [paymentContractDialogOpen, setPaymentContractDialogOpen] = useState(false);
  const [suggestPlanDialogOpen, setSuggestPlanDialogOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [contractCardKey, setContractCardKey] = useState(0);
  /** When set, show confirmation modal before awarding this bid. */
  const [bidToAward, setBidToAward] = useState<{
    id: string;
    diggerDisplayName: string;
    diggerId: string;
    amount: number;
    pricing_model?: string;
  } | null>(null);
  /** Whether Gigger has a saved payment method (for exclusive award options). */
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  /** Show add-payment dialog inside Award flow (when no PM). */
  const [showAddPaymentInAward, setShowAddPaymentInAward] = useState(false);
  /** Digger profile IDs that have an active conversation for this gig (for "Chatting" badge). */
  const [conversationDiggerIds, setConversationDiggerIds] = useState<Set<string>>(new Set());
  /** Bid IDs pinned by the Gigger for this gig (persisted in localStorage). */
  const [pinnedBidIds, setPinnedBidIds] = useState<Set<string>>(() => getPinnedBidIdsForGig(gigId));

  useEffect(() => {
    if (!gigId) return;
    setPinnedBidIds(getPinnedBidIdsForGig(gigId));
  }, [gigId]);

  // Fetch hasPaymentMethod when Award dialog opens for exclusive bid
  useEffect(() => {
    if (!bidToAward || bidToAward.pricing_model !== "success_based") {
      setHasPaymentMethod(null);
      return;
    }
    let cancelled = false;
    invokeEdgeFunction<{ paymentMethods?: unknown[] }>(supabase, "manage-payment-methods", { method: "GET" })
      .then((data) => {
        if (!cancelled) setHasPaymentMethod((data?.paymentMethods?.length ?? 0) > 0);
      })
      .catch(() => {
        if (!cancelled) setHasPaymentMethod(false);
      });
    return () => { cancelled = true; };
  }, [bidToAward?.id, bidToAward?.pricing_model]);

  const togglePin = useCallback(
    (bidId: string) => {
      setPinnedBidIds((prev) => {
        const next = new Set(prev);
        if (next.has(bidId)) next.delete(bidId);
        else next.add(bidId);
        setPinnedBidIdsForGig(gigId, [...next]);
        return next;
      });
    },
    [gigId]
  );

  const rawDisplayed = isOwner ? bids : (currentDiggerId ? bids.filter((b) => (b as any).digger_id === currentDiggerId) : bids);
  const filtered = useMemo(
    () => (isOwner && onFilterChange ? applyBidFilters(rawDisplayed, filterState) : rawDisplayed),
    [isOwner, rawDisplayed, filterState, onFilterChange]
  );
  const displayedBids = useMemo(() => {
    let sorted: Bid[];
    if (sortBy === "newest") {
      sorted = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "rating") {
      sorted = [...filtered].sort((a, b) => (b.digger_profiles?.average_rating ?? 0) - (a.digger_profiles?.average_rating ?? 0));
    } else if (sortBy === "highest_price") {
      sorted = [...filtered].sort((a, b) => {
        const amax = b.amount_max ?? b.amount;
        const bmax = a.amount_max ?? a.amount;
        return amax - bmax;
      });
    } else {
      sorted = [...filtered].sort((a, b) => {
        const amin = a.amount_min ?? a.amount;
        const bmin = b.amount_min ?? b.amount;
        return amin - bmin;
      });
    }
    // Awarded bids first for Giggers
    if (isOwner) {
      sorted = [...sorted].sort((a, b) => {
        const aAwarded = !!(a.awarded);
        const bAwarded = !!(b.awarded);
        if (aAwarded && !bAwarded) return -1;
        if (!aAwarded && bAwarded) return 1;
        return 0;
      });
    }
    // Pinned first for Giggers
    if (isOwner && pinnedBidIds.size > 0) {
      return [...sorted].sort((a, b) => {
        const aPin = pinnedBidIds.has(a.id);
        const bPin = pinnedBidIds.has(b.id);
        if (aPin && !bPin) return -1;
        if (!aPin && bPin) return 1;
        return 0;
      });
    }
    return sorted;
  }, [filtered, sortBy, isOwner, pinnedBidIds]);

  const loadBids = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bids' as any)
        .select(`
          *,
          digger_profiles (
            id,
            handle,
            business_name,
            profession,
            profile_image_url,
            average_rating,
            total_ratings,
            years_experience,
            completion_rate,
            response_time_hours,
            verified,
            is_insured,
            is_bonded,
            is_licensed,
            skills,
            certifications,
            city,
            state,
            country,
            custom_occupation_title,
            profile_name,
            offers_free_estimates,
            profiles:profiles!digger_profiles_user_id_fkey ( full_name, avatar_url )
          )
        `)
        .eq('gig_id', gigId)
        .order('amount', { ascending: true }); // Race to the bottom - lowest bids first

      if (error) throw error;

      const bidsList = (data as any) || [];
      if (bidsList.length === 0) {
        setBids([]);
        return;
      }

      // Single query for all verified reference counts (avoid N+1)
      const diggerIds = [...new Set(bidsList.map((b: any) => b.digger_profiles?.id).filter(Boolean))] as string[];
      const refCountByDigger: Record<string, number> = {};
      diggerIds.forEach((did) => {
        refCountByDigger[did] = 0;
      });
      if (diggerIds.length > 0) {
        const { data: refRows } = await supabase
          .from('references')
          .select('digger_id')
          .in('digger_id', diggerIds)
          .eq('is_verified', true);
        (refRows || []).forEach((r: { digger_id: string }) => {
          refCountByDigger[r.digger_id] = (refCountByDigger[r.digger_id] ?? 0) + 1;
        });
      }
      const bidsWithRefs = bidsList.map((bid: any) => ({
        ...bid,
        reference_count: refCountByDigger[bid.digger_profiles?.id] ?? 0,
      }));

      setBids(bidsWithRefs);
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setLoading(false);
    }
  }, [gigId]);

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  // Fetch which diggers have a conversation for this gig (for "Chatting" / In progress indicator)
  useEffect(() => {
    if (!isOwner || !gigId) {
      setConversationDiggerIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("conversations" as any)
        .select("digger_id")
        .eq("gig_id", gigId)
        .not("digger_id", "is", null);
      if (cancelled || error) return;
      const ids = new Set((data || []).map((r: any) => r.digger_id));
      if (!cancelled) setConversationDiggerIds(ids);
    })();
    return () => { cancelled = true; };
  }, [isOwner, gigId]);

  // Report stats for sidebar when owner and statsInSidebar
  useEffect(() => {
    if (!isOwner || !onStats || !statsInSidebar) return;
    const totalBids = displayedBids.length;
    const totalUnfiltered = rawDisplayed.length;
    const avgPrice =
      totalBids > 0
        ? displayedBids.reduce((sum, b) => {
            if (b.amount_min != null && b.amount_max != null) return sum + (b.amount_min + b.amount_max) / 2;
            return sum + (b.amount_min ?? b.amount_max ?? b.amount);
          }, 0) / totalBids
        : 0;
    const lowestBid = displayedBids[0];
    const lowestAmount = lowestBid ? (lowestBid.amount_min ?? lowestBid.amount) : 0;
    const highestBid = displayedBids[displayedBids.length - 1];
    const highestAmount = highestBid ? (highestBid.amount_max ?? highestBid.amount) : 0;
    onStats({ totalBids, totalUnfiltered, avgPrice, lowestAmount, highestAmount });
  }, [isOwner, onStats, statsInSidebar, displayedBids, rawDisplayed.length]);

  // Real-time: refresh bids when new proposals arrive or bids are updated
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel(`bids:gig:${gigId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `gig_id=eq.${gigId}`,
        },
        () => {
          loadBids();
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [gigId, loadBids]);

  /** Gigger awards a bid: award = hire. Non-exclusive: DB update only. Exclusive: payment flow is handled in confirm dialog (charge-gigger-deposit → webhook sets in_progress). */
  const handleAwardBid = async (bidId: string) => {
    setBidToAward(null);
    setAccepting(bidId);
    try {
      const { data: bidData, error: bidError } = await supabase
        .from('bids' as any)
        .select('amount, timeline, digger_id')
        .eq('id', bidId)
        .single();

      if (bidError) throw bidError;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const diggerId = (bidData as any)?.digger_id;
      const now = new Date().toISOString();

      const { error: bidUpdateError } = await supabase
        .from('bids' as any)
        .update({
          awarded: true,
          awarded_at: now,
          awarded_by: authUser?.id ?? null,
          status: 'accepted',
        })
        .eq('id', bidId);

      if (bidUpdateError) throw bidUpdateError;

      const gigUpdate: Record<string, unknown> = {
        status: 'in_progress',
        awarded_bid_id: bidId,
        awarded_at: now,
      };
      if (diggerId) gigUpdate.awarded_digger_id = diggerId;

      const { error: gigError } = await supabase
        .from('gigs' as any)
        .update(gigUpdate)
        .eq('id', gigId);

      if (gigError) throw gigError;

      try {
        await supabase.functions.invoke('send-bid-notification', {
          body: {
            type: 'awarded',
            bidId,
            gigId,
            diggerId: (bidData as any)?.digger_id,
            amount: (bidData as any)?.amount,
            timeline: (bidData as any)?.timeline,
          },
        });
      } catch (emailError) {
        console.error('Failed to send award notification:', emailError);
      }

      toast({
        title: "Bid awarded",
        description: "The professional has been hired and notified. You can set up the payment contract (milestones) next.",
      });

      loadBids();
      onAwardSuccess?.();
    } catch (error: any) {
      console.error('Error awarding bid:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to award bid",
        variant: "destructive",
      });
    } finally {
      setAccepting(null);
    }
  };

  /** Confirm award: for exclusive, start 15% payment flow (saved card or Checkout); for non-exclusive, award = hire (handleAwardBid). */
  const handleConfirmAward = async (useCheckout?: boolean) => {
    if (!bidToAward) return;
    const { id, diggerId, pricing_model } = bidToAward;
    const isExclusive = pricing_model === "success_based";

    if (isExclusive) {
      setAccepting(id);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const data = await invokeEdgeFunction<{
          success?: boolean;
          requiresPayment?: boolean;
          checkoutUrl?: string;
          requiresAction?: boolean;
          clientSecret?: string;
          error?: string;
        }>(supabase, "charge-gigger-deposit", {
          body: {
            bidId: id,
            gigId,
            giggerId: authUser?.id ?? null,
            diggerId,
            origin: window.location.origin,
            useCheckout: useCheckout ?? false,
          },
        });

        if (data?.requiresPayment && data?.checkoutUrl) {
          setBidToAward(null);
          setAccepting(null);
          toast({
            title: "Redirecting to payment",
            description: "Complete the 15% deposit on the next page. You'll return here when done.",
          });
          window.location.href = data.checkoutUrl;
          loadBids();
          onAwardSuccess?.();
          return;
        }

        if (data?.requiresAction && data?.clientSecret && stripePromise) {
          const stripe = await stripePromise;
          if (!stripe) throw new Error("Stripe not loaded");
          const { error } = await stripe.confirmCardPayment(data.clientSecret);
          if (error) throw error;
          toast({ title: "Payment confirmed", description: "The professional has been awarded. They have 24 hours to accept." });
          setBidToAward(null);
          loadBids();
          onAwardSuccess?.();
          setAccepting(null);
          return;
        }

        if (data?.success) {
          toast({ title: "Payment confirmed", description: "The professional has been awarded. They have 24 hours to accept." });
          setBidToAward(null);
          loadBids();
          onAwardSuccess?.();
        } else if (data?.error) {
          throw new Error(data.error);
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Failed to start payment",
          variant: "destructive",
        });
      } finally {
        setAccepting(null);
        setBidToAward(null);
      }
      return;
    }

    await handleAwardBid(id);
  };

  const totalBids = displayedBids.length;
  const showBidsEmptyState = !loading && displayedBids.length === 0;
  const showBidsFilterEmpty = showBidsEmptyState && isOwner && statsInSidebar && rawDisplayed.length > 0 && onClearFilters;

  return (
    <div className="space-y-6">
      {/* Payment contract & milestones: show only after gig is awarded (not when status is "open") */}
      {(isOwner || currentDiggerId) && currentUserId && gigStatus && gigStatus !== "open" && (
        <ContractMilestonesCard
          key={contractCardKey}
          gigId={gigId}
          gigTitle={gigTitle}
          currentUserId={currentUserId}
          currentDiggerProfileId={currentDiggerId ?? null}
          onUpdate={() => {
            onAwardSuccess?.();
          }}
          gigStatus={gigStatus}
          suggestedMilestonesFromBid={
            (() => {
              const accepted = isOwner
                ? bids.find((b) => b.status === "accepted")
                : bids.find((b) => (b as any).digger_id === currentDiggerId && b.status === "accepted");
              const raw = (accepted as any)?.suggested_milestones;
              return Array.isArray(raw) && raw.length > 0 ? raw : null;
            })()
          }
          onSetupContractClick={
            isOwner
              ? () => {
                  const accepted = bids.find((b) => b.status === "accepted");
                  if (accepted) {
                    setSelectedBid(accepted);
                    setPaymentContractDialogOpen(true);
                  }
                }
              : undefined
          }
          onSuggestMilestoneClick={
            currentDiggerId && !isOwner
              ? () => {
                  const diggerAccepted = bids.find(
                    (b) => (b as any).digger_id === currentDiggerId && b.status === "accepted"
                  );
                  if (diggerAccepted) {
                    setSelectedBid(diggerAccepted);
                    setSuggestPlanDialogOpen(true);
                  }
                }
              : undefined
          }
        />
      )}

      {/* Digger with no bid: show message. When loading, only the relevant part shows loading. */}
      {!isOwner && currentDiggerId && !loading && displayedBids.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You haven&apos;t placed a bid on this gig yet.
          </CardContent>
        </Card>
      )}
      {/* Digger viewing own bid: use same card style as gigger sees. */}
      {!isOwner && currentDiggerId && !loading && displayedBids.length > 0 && displayedBids.map((bid) => (
        <DiggerProposalCard
          key={bid.id}
          bid={bid}
          gigTitle={gigTitle}
          gigId={gigId}
          diggerProfile={bid.digger_profiles}
          referenceCount={bid.reference_count}
          isOwner={false}
          isFixedPrice={isFixedPrice}
          isOnline={onlineDiggers.has(bid.digger_profiles.id)}
          hasActiveChat={conversationDiggerIds.has(bid.digger_profiles.id)}
          isAwardedWaitingResponse={!!(bid.awarded && bid.status !== "accepted")}
          showDiggerActions={!!(onEditProposal || onMessageClient)}
          onEditProposal={onEditProposal}
          onMessageClient={onMessageClient}
          canMessageClient={canMessageClient}
          messageClientTooltip={messageClientTooltip}
          gigStatus={gigStatus ?? undefined}
        />
      ))}
      {/* Bid cards: only show for gig owner (Gigger); in Digger mode show header + stats only. When loading, only this section shows loading. */}
      {isOwner && (
        <>
          {loading ? (
            <Card>
              <CardContent className="py-6 flex flex-col items-center justify-center gap-2">
                <LoadingSpinner label="Loading bids..." />
              </CardContent>
            </Card>
          ) : showBidsFilterEmpty ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground font-medium">No bids match your filters</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try loosening your filters or clear them to see all {rawDisplayed.length} bid{rawDisplayed.length === 1 ? "" : "s"}.
                </p>
                <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onClearFilters}>
                  <X className="h-4 w-4" />
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          ) : showBidsEmptyState ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No bids yet. Diggers will appear here when they bid.
              </CardContent>
            </Card>
          ) : (
          displayedBids.map((bid) => (
            <DiggerProposalCard
              key={bid.id}
              bid={bid}
              gigTitle={gigTitle}
              gigId={gigId}
              diggerProfile={bid.digger_profiles}
              referenceCount={bid.reference_count}
              isOwner={true}
              isFixedPrice={isFixedPrice}
              isOnline={onlineDiggers.has(bid.digger_profiles.id)}
              hasActiveChat={conversationDiggerIds.has(bid.digger_profiles.id)}
              isPinned={pinnedBidIds.has(bid.id)}
              onPinToggle={() => togglePin(bid.id)}
              onAccept={() => {
                const name =
                  (bid.digger_profiles as any)?.profiles?.full_name ||
                  (bid.digger_profiles as any)?.business_name ||
                  (bid.digger_profiles as any)?.profile_name ||
                  (bid.digger_profiles as any)?.profession ||
                  "This professional";
                setBidToAward({
                  id: bid.id,
                  diggerDisplayName: String(name).trim() || "This professional",
                  diggerId: (bid as any).digger_id ?? (bid as any).digger_profiles?.id ?? "",
                  amount: bid.amount ?? 0,
                  pricing_model: bid.pricing_model,
                });
              }}
              onConfirmHire={loadBids}
              onCompleteWork={loadBids}
              acceptingId={accepting}
              isAwardedWaitingResponse={!!(bid.awarded && bid.status !== "accepted")}
              isOtherBidAwarded={displayedBids.some(
                (b) => b.id !== bid.id && !!b.awarded && b.status !== "accepted"
              )}
              isOtherBidHired={displayedBids.some(
                (b) => b.id !== bid.id && !!b.awarded && b.status === "accepted"
              )}
              onCancelAward={gigStatus === "awarded" ? onCancelAward : undefined}
              cancelAwardLoading={cancelAwardLoading}
            />
          )))}
        </>
      )}

      <AlertDialog open={!!bidToAward} onOpenChange={(open) => !open && setBidToAward(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Award this bid?</AlertDialogTitle>
            <AlertDialogDescription>
              {bidToAward && (
                <>
                  {bidToAward.pricing_model === "success_based" ? (
                    <>
                      You&apos;ll be charged <strong>15% (${((bidToAward.amount * 0.15)).toFixed(0)})</strong> to award this gig to <strong>{bidToAward.diggerDisplayName}</strong>. They must accept within 24 hours or the award expires (you get a full refund; they may be charged a $100 penalty). If they decline, you get a full refund and they&apos;re charged a $100 penalty.
                    </>
                  ) : (
                    <>
                      Award this gig to <strong>{bidToAward.diggerDisplayName}</strong>. They&apos;ll be hired and notified. You can set up the payment contract (milestones) next.
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <AlertDialogCancel disabled={!!accepting}>Cancel</AlertDialogCancel>
            {bidToAward?.pricing_model === "success_based" ? (
              hasPaymentMethod === false ? (
                <div className="flex flex-col gap-3 w-full">
                  <p className="text-sm text-muted-foreground">
                    Add a payment method below to pay directly, or pay via Stripe Checkout.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        handleConfirmAward(true);
                      }}
                      disabled={!!accepting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {accepting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Pay 15% & award (Checkout)
                    </Button>
                    <Dialog open={showAddPaymentInAward} onOpenChange={setShowAddPaymentInAward}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Add payment method first
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add payment method</DialogTitle>
                          <DialogDescription>
                            Your card is stored securely by Stripe. You can then pay the deposit directly without leaving this page.
                          </DialogDescription>
                        </DialogHeader>
                        <PaymentMethodForm
                          onSuccess={() => {
                            setShowAddPaymentInAward(false);
                            setHasPaymentMethod(true);
                            toast({ title: "Payment method added", description: "You can now pay the deposit with your saved card." });
                          }}
                          onCancel={() => setShowAddPaymentInAward(false)}
                        />
                      </DialogContent>
                    </Dialog>
                    <span className="text-muted-foreground text-xs">or</span>
                    <Button size="sm" variant="ghost" className="h-auto py-1 px-2 text-xs" asChild>
                      <Link to="/payment-methods" onClick={() => setBidToAward(null)}>
                        Add in Settings
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {hasPaymentMethod && (
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        handleConfirmAward(false);
                      }}
                      disabled={!!accepting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {accepting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Pay with saved card
                      <span className="ml-1.5 text-xs opacity-90">(Recommended)</span>
                    </Button>
                  )}
                  <Button
                    variant={hasPaymentMethod ? "outline" : "default"}
                    onClick={(e) => {
                      e.preventDefault();
                      handleConfirmAward(true);
                    }}
                    disabled={!!accepting}
                    className={!hasPaymentMethod ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {accepting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    {hasPaymentMethod ? "Pay with new card (Checkout)" : "Pay 15% & award"}
                  </Button>
                </>
              )
            ) : (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmAward();
                }}
                disabled={!!accepting}
                className="bg-green-600 hover:bg-green-700"
              >
                {accepting ? "Awarding..." : "Award"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedBid && (
        <>
          <PaymentContractDialog
            open={paymentContractDialogOpen}
            onOpenChange={setPaymentContractDialogOpen}
            gigId={gigId}
            bidId={selectedBid.id}
            bidAmount={selectedBid.amount}
            gigTitle={gigTitle}
            pricingModel={selectedBid.pricing_model}
            suggestedMilestones={(selectedBid as any).suggested_milestones}
            hourlyRate={(selectedBid as any).hourly_rate ?? null}
            estimatedHours={(selectedBid as any).estimated_hours ?? null}
            onComplete={() => {
              loadBids();
              setContractCardKey((k) => k + 1);
            }}
          />
          <SuggestMilestonePlanDialog
            open={suggestPlanDialogOpen}
            onOpenChange={setSuggestPlanDialogOpen}
            gigId={gigId}
            bidId={selectedBid.id}
            bidAmount={selectedBid.amount}
            gigTitle={gigTitle}
            pricingModel={selectedBid.pricing_model}
            suggestedMilestones={Array.isArray((selectedBid as any).suggested_milestones) ? (selectedBid as any).suggested_milestones : null}
            onComplete={() => {
              loadBids();
              setContractCardKey((k) => k + 1);
            }}
          />
        </>
      )}
    </div>
  );
};
