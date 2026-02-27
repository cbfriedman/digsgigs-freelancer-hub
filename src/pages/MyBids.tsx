import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";
import { WithdrawBidDialog } from "@/components/WithdrawBidDialog";
import { StripeConnectBanner } from "@/components/StripeConnectBanner";

interface Bid {
  id: string;
  amount: number;
  amount_min?: number;
  amount_max?: number;
  timeline: string;
  proposal: string;
  status: string;
  created_at: string;
  withdrawn_at: string | null;
  withdrawal_penalty: number | null;
  gig_id?: string;
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
      window.history.replaceState({}, "", "/my-bids");
    } else if (withdrawal === "cancelled") {
      toast.info("Withdrawal cancelled. Your bid remains active.");
      window.history.replaceState({}, "", "/my-bids");
    }

    // Stripe Connect return: user completed or refreshed onboarding
    const connectSuccess = searchParams.get("success");
    const connectRefresh = searchParams.get("refresh");
    if (connectSuccess === "true") {
      toast.success("Stripe Connect setup complete. Your account is being verified—you’ll be able to receive payments once verification is done.");
      window.history.replaceState({}, "", "/my-bids");
    } else if (connectRefresh === "true") {
      window.history.replaceState({}, "", "/my-bids");
    }

    loadBids();
  }, [searchParams]);

  const loadBids = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to view your bids");
      navigate("/register");
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

    // Get all bids (with nested gig via gig_id; use hint because gigs also has awarded_bid_id -> bids)
    const { data, error } = await supabase
      .from("bids")
      .select(`
        id,
        amount,
        amount_min,
        amount_max,
        timeline,
        proposal,
        status,
        created_at,
        withdrawn_at,
        withdrawal_penalty,
        gig_id,
        gigs!gig_id (
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
      setBids([]);
      setLoading(false);
      return;
    }

    // If we got bids but gigs are null (RLS blocked nested gig), ensure migration 20260218000000 is applied.
    // Still show the bid and link to gig page (where can_access_gig via bid will allow access).
    const bidsWithGigs = (data || []).map((b: any) => ({
      ...b,
      gigs: b.gigs ?? (b.gig_id ? { id: b.gig_id, title: "Project", description: null, budget_min: null, budget_max: null, location: "", status: "open" } : null),
    }));
    setBids(bidsWithGigs);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "secondary" | "default" | "destructive" | "outline"; label: string; icon?: typeof CheckCircle }> = {
      pending: { variant: "secondary", label: "Pending" },
      accepted: { variant: "default", label: "Accepted" },
      rejected: { variant: "destructive", label: "Rejected" },
      completed: { variant: "default", label: "Completed", icon: CheckCircle },
      withdrawn: { variant: "outline", label: "Withdrawn", icon: XCircle },
    };
    const c = config[status] || { variant: "secondary" as const, label: status };
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="gap-1 w-fit text-xs font-normal">
        {Icon && <Icon className="h-3 w-3" />}
        {c.label}
      </Badge>
    );
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${min.toLocaleString()}–$${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max?.toLocaleString()}`;
  };

  const activeStatuses = new Set(["pending", "accepted"]);
  const activeBids = bids.filter((b) => activeStatuses.has(b.status));
  const pastBids = bids.filter((b) => !activeStatuses.has(b.status));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Loading bids..." />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <StripeConnectBanner />
          <header className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-1.5 -ml-2 text-muted-foreground mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <h1 className="text-lg font-semibold text-foreground">My Bids</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {bids.length === 0
                ? "Proposals you’ve submitted. Open a bid to view the gig and messages."
                : `${bids.length} bid${bids.length === 1 ? "" : "s"} · newest first`}
            </p>
          </header>

          {bids.length === 0 ? (
            <section className="text-center py-12 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-4">No bids yet.</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/browse-gigs")}>
                Browse gigs
              </Button>
            </section>
          ) : (
            <div className="space-y-8">
              {activeBids.length > 0 && (
                <section>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Active
                  </h2>
                  <ul className="space-y-2">
                    {activeBids.map((bid) => (
                      <BidRow
                        key={bid.id}
                        bid={bid}
                        getStatusBadge={getStatusBadge}
                        formatBudget={formatBudget}
                        formatDistanceToNow={formatDistanceToNow}
                        onView={() => navigate(`/gig/${bid.gigs.id}`)}
                        WithdrawComponent={
                          bid.status === "accepted" && !bid.withdrawn_at ? (
                            <WithdrawBidDialog
                              bidId={bid.id}
                              bidAmount={bid.amount}
                              gigTitle={bid.gigs.title}
                              onSuccess={loadBids}
                            />
                          ) : undefined
                        }
                      />
                    ))}
                  </ul>
                </section>
              )}
              {pastBids.length > 0 && (
                <section>
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Past
                  </h2>
                  <ul className="space-y-2">
                    {pastBids.map((bid) => (
                      <BidRow
                        key={bid.id}
                        bid={bid}
                        getStatusBadge={getStatusBadge}
                        formatBudget={formatBudget}
                        formatDistanceToNow={formatDistanceToNow}
                        onView={() => navigate(`/gig/${bid.gigs.id}`)}
                        WithdrawComponent={undefined}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

function BidRow({
  bid,
  getStatusBadge,
  formatBudget,
  formatDistanceToNow,
  onView,
  WithdrawComponent,
}: {
  bid: Bid;
  getStatusBadge: (s: string) => JSX.Element;
  formatBudget: (a: number | null, b: number | null) => string | null;
  formatDistanceToNow: (date: Date, opts: { addSuffix: boolean }) => string;
  onView: () => void;
  WithdrawComponent?: ReactNode;
}) {
  return (
    <li className="border border-border rounded-lg overflow-hidden">
      <div className="p-4 flex items-stretch justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className="font-medium text-sm block">{bid.gigs.title}</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>Your bid: ${bid.amount.toLocaleString()}</span>
            {formatBudget(bid.gigs.budget_min, bid.gigs.budget_max) && (
              <span>Gig: {formatBudget(bid.gigs.budget_min, bid.gigs.budget_max)}</span>
            )}
            <span>{formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}</span>
          </div>
          {bid.proposal && (
            <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">{bid.proposal}</p>
          )}
        </div>
        <div className="flex flex-col items-end justify-between gap-3 shrink-0 self-stretch">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onView}>
              View gig
            </Button>
            {WithdrawComponent}
          </div>
          <div className="mt-auto">{getStatusBadge(bid.status)}</div>
        </div>
      </div>
      {bid.withdrawn_at != null && bid.withdrawal_penalty != null && (
        <div className="px-4 py-2 bg-muted/40 border-t border-border text-xs text-muted-foreground">
          Withdrawn · ${bid.withdrawal_penalty.toFixed(2)} penalty · {formatDistanceToNow(new Date(bid.withdrawn_at), { addSuffix: true })}
        </div>
      )}
    </li>
  );
}

export default MyBids;