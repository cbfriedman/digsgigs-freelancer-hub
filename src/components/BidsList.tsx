import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CompleteWorkDialog } from "@/components/CompleteWorkDialog";
import { EscrowContractDialog } from "@/components/EscrowContractDialog";
import { ConfirmHireDialog } from "@/components/ConfirmHireDialog";
import { AnonymizedBidCard } from "@/components/AnonymizedBidCard";
import { DiggerProposalCard } from "@/components/DiggerProposalCard";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";
import { TrendingUp, DollarSign, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";

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
}: BidsListProps) => {
  const { toast } = useToast();
  const { onlineDiggers } = useDiggerPresence();
  const [bids, setBids] = useState<Bid[]>([]);
  const rawDisplayed = isOwner ? bids : (currentDiggerId ? bids.filter((b) => (b as any).digger_id === currentDiggerId) : bids);
  const filtered = useMemo(
    () => (isOwner && onFilterChange ? applyBidFilters(rawDisplayed, filterState) : rawDisplayed),
    [isOwner, rawDisplayed, filterState, onFilterChange]
  );
  const displayedBids = useMemo(() => {
    if (sortBy === "newest") {
      return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (sortBy === "rating") {
      return [...filtered].sort((a, b) => (b.digger_profiles?.average_rating ?? 0) - (a.digger_profiles?.average_rating ?? 0));
    }
    if (sortBy === "highest_price") {
      return [...filtered].sort((a, b) => {
        const amax = b.amount_max ?? b.amount;
        const bmax = a.amount_max ?? a.amount;
        return amax - bmax;
      });
    }
    // lowest_price (default): already ordered by amount from API; re-apply by min amount
    return [...filtered].sort((a, b) => {
      const amin = a.amount_min ?? a.amount;
      const bmin = b.amount_min ?? b.amount;
      return amin - bmin;
    });
  }, [filtered, sortBy]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [escrowDialogOpen, setEscrowDialogOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  /** Digger profile IDs that have an active conversation for this gig (for "Chatting" badge). */
  const [conversationDiggerIds, setConversationDiggerIds] = useState<Set<string>>(new Set());

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
            profiles:profiles!digger_profiles_user_id_fkey ( full_name )
          )
        `)
        .eq('gig_id', gigId)
        .order('amount', { ascending: true }); // Race to the bottom - lowest bids first

      if (error) throw error;
      
      // Fetch reference counts for each digger
      const bidsWithRefs = await Promise.all(
        ((data as any) || []).map(async (bid: any) => {
          const { count } = await supabase
            .from('references')
            .select('*', { count: 'exact', head: true })
            .eq('digger_id', bid.digger_profiles.id)
            .eq('is_verified', true);
          return { ...bid, reference_count: count || 0 };
        })
      );
      
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
      const ids = new Set((data || []).map((r: { digger_id: string }) => r.digger_id));
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

  const handleAcceptBid = async (bidId: string) => {
    setAccepting(bidId);
    
    try {
      // Get bid details before updating
      const { data: bidData, error: bidError } = await supabase
        .from('bids' as any)
        .select('amount, timeline, digger_id')
        .eq('id', bidId)
        .single();

      if (bidError) throw bidError;

      const { error } = await supabase
        .from('bids' as any)
        .update({ status: 'accepted' })
        .eq('id', bidId);

      if (error) throw error;

      // Update gig status to in_progress
      await supabase
        .from('gigs' as any)
        .update({ status: 'in_progress' })
        .eq('id', gigId);

      // Send email notification
      try {
        await supabase.functions.invoke('send-bid-notification', {
          body: {
            type: 'accepted',
            bidId,
            gigId,
            diggerId: (bidData as any)?.digger_id,
            amount: (bidData as any)?.amount,
            timeline: (bidData as any)?.timeline,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the acceptance if email fails
      }

      toast({
        title: "Bid accepted!",
        description: isFixedPrice 
          ? "Now set up the escrow contract with milestones."
          : "The digger has been notified.",
      });

      loadBids();

      // If fixed price, open escrow dialog
      if (isFixedPrice) {
        const acceptedBid = bids.find(b => b.id === bidId);
        if (acceptedBid) {
          setSelectedBid(acceptedBid);
          setEscrowDialogOpen(true);
        }
      }
    } catch (error: any) {
      console.error('Error accepting bid:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept bid",
        variant: "destructive",
      });
    } finally {
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner label="Loading bids..." />
      </div>
    );
  }

  if (displayedBids.length === 0) {
    if (isOwner && statsInSidebar && rawDisplayed.length > 0 && onClearFilters) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold">Bids</h3>
            <p className="text-sm text-muted-foreground mt-1">Review bids below. New bids appear in real time.</p>
          </div>
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
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {!isOwner && currentDiggerId
            ? "You haven't placed a bid on this gig yet."
            : "No bids yet. Diggers will appear here when they bid."}
        </CardContent>
      </Card>
    );
  }

  const totalBids = displayedBids.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div>
          <h3 className="text-xl font-semibold">
            Bids {totalBids > 0 && <span className="text-muted-foreground font-normal">({totalBids})</span>}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwner
              ? "Review bids below. New bids appear in real time."
              : "Bids are anonymous until you award or unlock contact info."}
          </p>
        </div>
        {totalBids > 0 && !statsInSidebar && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total bids</span>
              <span className="font-semibold tabular-nums">{totalBids}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Avg</span>
              <span className="font-semibold tabular-nums">
                $
                {Math.round(
                  displayedBids.reduce((sum, b) => {
                    if (b.amount_min != null && b.amount_max != null) return sum + (b.amount_min + b.amount_max) / 2;
                    return sum + (b.amount_min ?? b.amount_max ?? b.amount);
                  }, 0) / totalBids
                ).toLocaleString()}
              </span>
            </div>
            {displayedBids[0] && (
              <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Lowest</span>
                <span className="font-semibold tabular-nums text-green-600">
                  ${(displayedBids[0].amount_min ?? displayedBids[0].amount).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bid cards: only show for gig owner (Gigger); in Digger mode show header + stats only */}
      {isOwner && (
        <>
          {displayedBids.map((bid) => (
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
              onAccept={() => handleAcceptBid(bid.id)}
              onConfirmHire={loadBids}
              onCompleteWork={loadBids}
              acceptingId={accepting}
            />
          ))}
        </>
      )}

      {selectedBid && (
        <EscrowContractDialog
          open={escrowDialogOpen}
          onOpenChange={setEscrowDialogOpen}
          bidId={selectedBid.id}
          bidAmount={selectedBid.amount}
          gigTitle={gigTitle}
          onComplete={loadBids}
        />
      )}
    </div>
  );
};
