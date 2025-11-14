import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { CompleteWorkDialog } from "@/components/CompleteWorkDialog";
import { Loader2, Star } from "lucide-react";

interface Bid {
  id: string;
  amount: number;
  timeline: string;
  proposal: string;
  status: string;
  created_at: string;
  digger_profiles: {
    id: string;
    handle: string;
    profession: string;
    profile_image_url: string;
    average_rating: number;
    total_ratings: number;
  };
}

interface BidsListProps {
  gigId: string;
  gigTitle: string;
  isOwner: boolean;
}

export const BidsList = ({ gigId, gigTitle, isOwner }: BidsListProps) => {
  const { toast } = useToast();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    loadBids();
  }, [gigId]);

  const loadBids = async () => {
    try {
      const { data, error } = await supabase
        .from('bids' as any)
        .select(`
          *,
          digger_profiles (
            id,
            handle,
            profession,
            profile_image_url,
            average_rating,
            total_ratings
          )
        `)
        .eq('gig_id', gigId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBids((data as any) || []);
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setLoading(false);
    }
  };

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
        description: "The digger has been notified.",
      });

      loadBids();
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

  const getInitials = (handle: string) => {
    return handle?.slice(0, 2).toUpperCase() || '??';
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
          No bids yet. Be the first to bid on this gig!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">
        Bids ({bids.length})
      </h3>
      
      {bids.map((bid) => (
        <Card key={bid.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={bid.digger_profiles.profile_image_url} />
                  <AvatarFallback>{getInitials(bid.digger_profiles.handle)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{bid.digger_profiles.handle}</CardTitle>
                  <CardDescription>{bid.digger_profiles.profession}</CardDescription>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span className="text-sm font-semibold">{bid.digger_profiles.average_rating || 0}</span>
                    <span className="text-sm text-muted-foreground">
                      ({bid.digger_profiles.total_ratings || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">${bid.amount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{bid.timeline}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Proposal</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{bid.proposal}</p>
            </div>

            <div className="flex items-center justify-between">
              <Badge variant={
                bid.status === 'accepted' ? 'default' :
                bid.status === 'rejected' ? 'destructive' :
                bid.status === 'completed' ? 'default' :
                'secondary'
              }>
                {bid.status}
              </Badge>

              <div className="flex gap-2">
                {isOwner && bid.status === 'pending' && (
                  <Button
                    onClick={() => handleAcceptBid(bid.id)}
                    disabled={accepting === bid.id}
                  >
                    {accepting === bid.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      'Accept Bid'
                    )}
                  </Button>
                )}

                {isOwner && bid.status === 'accepted' && (
                  <CompleteWorkDialog
                    bidId={bid.id}
                    bidAmount={bid.amount}
                    diggerId={bid.digger_profiles.id}
                    gigTitle={gigTitle}
                    onComplete={loadBids}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
