import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, DollarSign, Calendar, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { WithdrawBidDialog } from "@/components/WithdrawBidDialog";
import { StripeConnectBanner } from "@/components/StripeConnectBanner";
import { Navigation } from "@/components/Navigation";

interface Bid {
  id: string;
  amount: number;
  timeline: string;
  proposal: string;
  status: string;
  created_at: string;
  withdrawn_at: string | null;
  withdrawal_penalty: number | null;
  gigs: {
    id: string;
    title: string;
    description: string;
    budget_min: number | null;
    budget_max: number | null;
    location: string;
    status: string;
  };
}

const MyBids = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for withdrawal success/cancel params
    const withdrawal = searchParams.get("withdrawal");
    if (withdrawal === "success") {
      toast.success("Bid withdrawn successfully. The penalty has been paid.");
      // Clear params
      window.history.replaceState({}, "", "/my-bids");
    } else if (withdrawal === "cancelled") {
      toast.info("Withdrawal cancelled. Your bid remains active.");
      window.history.replaceState({}, "", "/my-bids");
    }

    loadBids();
  }, [searchParams]);

  const loadBids = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to view your bids");
      navigate("/auth?type=digger");
      return;
    }

    // Get digger profile
    const { data: diggerProfile } = await supabase
      .from("digger_profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!diggerProfile) {
      toast.error("Digger profile not found");
      navigate("/digger-registration");
      return;
    }

    // Get all bids
    const { data, error } = await supabase
      .from("bids")
      .select(`
        id,
        amount,
        timeline,
        proposal,
        status,
        created_at,
        withdrawn_at,
        withdrawal_penalty,
        gigs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          location,
          status
        )
      `)
      .eq("digger_id", diggerProfile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading bids:", error);
      toast.error("Failed to load your bids");
    } else {
      setBids(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "Pending" },
      accepted: { variant: "default", label: "Accepted" },
      rejected: { variant: "destructive", label: "Rejected" },
      completed: { variant: "default", label: "Completed", icon: CheckCircle },
      withdrawn: { variant: "outline", label: "Withdrawn", icon: XCircle },
    };

    const config = variants[status] || { variant: "secondary", label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max?.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <StripeConnectBanner />
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              My Bids
            </h1>
            <p className="text-muted-foreground mt-2">
              Track all your submitted bids and manage accepted offers
            </p>
          </div>
        </div>

        {bids.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Bids Yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Start bidding on gigs to grow your business
              </p>
              <Button onClick={() => navigate("/browse-gigs")}>
                Browse Available Gigs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {bids.map((bid) => (
              <Card key={bid.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">
                        {bid.gigs.title}
                      </CardTitle>
                      {getStatusBadge(bid.status)}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        ${bid.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Your Bid
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-muted-foreground">Gig Budget</div>
                          <div className="font-medium">
                            {formatBudget(bid.gigs.budget_min, bid.gigs.budget_max)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-muted-foreground">Timeline</div>
                          <div className="font-medium">{bid.timeline}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="text-muted-foreground">Bid Submitted</div>
                          <div className="font-medium">
                            {formatDistanceToNow(new Date(bid.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Your Proposal
                      </div>
                      <p className="text-sm line-clamp-4">{bid.proposal}</p>
                    </div>
                  </div>

                  {bid.withdrawn_at && bid.withdrawal_penalty && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="font-semibold text-sm">Withdrawn</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Penalty paid: ${bid.withdrawal_penalty.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(bid.withdrawn_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/gig/${bid.gigs.id}`)}
                    >
                      View Gig Details
                    </Button>
                    
                    {bid.status === "accepted" && !bid.withdrawn_at && (
                      <WithdrawBidDialog
                        bidId={bid.id}
                        bidAmount={bid.amount}
                        gigTitle={bid.gigs.title}
                        onSuccess={loadBids}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default MyBids;