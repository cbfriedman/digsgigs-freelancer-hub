import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CompleteWorkDialog } from "@/components/CompleteWorkDialog";
import { EscrowContractDialog } from "@/components/EscrowContractDialog";
import { ConfirmHireDialog } from "@/components/ConfirmHireDialog";
import { AnonymizedBidCard } from "@/components/AnonymizedBidCard";
import { DiggerProposalCard } from "@/components/DiggerProposalCard";
import { Loader2, TrendingUp, DollarSign, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    offers_free_estimates?: boolean;
  };
  reference_count?: number;
}

interface BidsListProps {
  gigId: string;
  gigTitle: string;
  isOwner: boolean;
  isFixedPrice?: boolean;
}

export const BidsList = ({ gigId, gigTitle, isOwner, isFixedPrice = false }: BidsListProps) => {
  const { toast } = useToast();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [escrowDialogOpen, setEscrowDialogOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

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
            offers_free_estimates
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No proposals yet. Check back soon!
        </CardContent>
      </Card>
    );
  }

  // Stats for gigger (owner)
  const totalBids = bids.length;
  const avgPrice =
    totalBids > 0
      ? bids.reduce((sum, b) => {
          if (b.amount_min != null && b.amount_max != null) return sum + (b.amount_min + b.amount_max) / 2;
          return sum + (b.amount_min ?? b.amount_max ?? b.amount);
        }, 0) / totalBids
      : 0;
  const lowestBid = bids[0];
  const lowestAmount = lowestBid ? (lowestBid.amount_min ?? lowestBid.amount) : 0;
  const highestBid = bids[bids.length - 1];
  const highestAmount = highestBid ? (highestBid.amount_max ?? highestBid.amount) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div>
          <h3 className="text-xl font-semibold">
            Proposals {totalBids > 0 && <span className="text-muted-foreground font-normal">({totalBids})</span>}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwner
              ? "Review proposals below. New bids appear in real time."
              : "Proposals are anonymous until you accept or unlock contact info"}
          </p>
        </div>
        {totalBids > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total bids</span>
              <span className="font-semibold tabular-nums">{totalBids}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Avg</span>
              <span className="font-semibold tabular-nums">${Math.round(avgPrice).toLocaleString()}</span>
            </div>
            {lowestAmount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Lowest</span>
                <span className="font-semibold tabular-nums text-green-600">${lowestAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isOwner
        ? bids.map((bid) => (
            <DiggerProposalCard
              key={bid.id}
              bid={bid}
              gigTitle={gigTitle}
              gigId={gigId}
              diggerProfile={bid.digger_profiles}
              referenceCount={bid.reference_count}
              isOwner={true}
              isFixedPrice={isFixedPrice}
              onAccept={() => handleAcceptBid(bid.id)}
              onConfirmHire={loadBids}
              onCompleteWork={loadBids}
              acceptingId={accepting}
            />
          ))
        : bids.map((bid, index) => (
            <AnonymizedBidCard
              key={bid.id}
              bid={bid}
              bidderNumber={index + 1}
              diggerProfile={bid.digger_profiles}
              referenceCount={bid.reference_count}
              isLowestBid={index === 0}
              isOwner={false}
              acceptingId={accepting}
            >
              {bid.status === "accepted" && !isFixedPrice && bid.awarded && (
                <CompleteWorkDialog
                  bidId={bid.id}
                  bidAmount={bid.amount}
                  diggerId={bid.digger_profiles.id}
                  gigTitle={gigTitle}
                  onComplete={loadBids}
                />
              )}
            </AnonymizedBidCard>
          ))}

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
