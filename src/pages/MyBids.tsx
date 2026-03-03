import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare, DollarSign, Calendar, FileText } from "lucide-react";
import { openFloatingChat } from "@/lib/openFloatingChat";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { WithdrawBidDialog } from "@/components/WithdrawBidDialog";
import { StripeConnectBanner } from "@/components/StripeConnectBanner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { XCircle, Loader2, CheckCircle2 } from "lucide-react";

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
    awarded_bid_id?: string | null;
  };
}

export type BidFilterOption = "all" | "pending" | "awarded" | "hired" | "lose" | "withdrawn";

function getBidCategory(bid: Bid): BidFilterOption | "rejected" | "completed" {
  const gigStatus = bid.gigs?.status ?? "";
  const awardedBidId = (bid.gigs as { awarded_bid_id?: string | null })?.awarded_bid_id ?? null;
  const isThisBidAwarded = awardedBidId !== null && awardedBidId === bid.id;
  if (bid.status === "withdrawn" || bid.withdrawn_at) return "withdrawn";
  if (isThisBidAwarded && (gigStatus === "in_progress" || gigStatus === "completed")) return "hired";
  if (isThisBidAwarded && gigStatus === "awarded") return "awarded";
  if (bid.status === "rejected" || (awardedBidId !== null && awardedBidId !== bid.id)) return "lose";
  if (bid.status === "pending") return "pending";
  if (bid.status === "completed") return "completed";
  if (bid.status === "accepted") return "hired";
  return "pending";
}

const FILTER_OPTIONS: { value: BidFilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "awarded", label: "Awarded" },
  { value: "hired", label: "Hired" },
  { value: "lose", label: "Lose" },
  { value: "withdrawn", label: "Withdrawn" },
];

const MyBids = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [diggerProfileId, setDiggerProfileId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BidFilterOption>("all");

  useEffect(() => {
    // Check for withdrawal success/cancel params and complete withdrawal flow if needed
    const withdrawal = searchParams.get("withdrawal");
    const penaltyId = searchParams.get("penalty_id");
    if (withdrawal === "success" && penaltyId) {
      (async () => {
        try {
          await invokeEdgeFunction(supabase, "process-withdrawal-payment", {
            body: { penaltyId },
          });
          toast.success("Bid withdrawn successfully. The penalty has been paid.");
          loadBids();
        } catch (e: any) {
          toast.error(e?.message || "Failed to complete withdrawal");
        } finally {
          window.history.replaceState({}, "", "/my-bids");
        }
      })();
      return;
    }
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
    setDiggerProfileId(diggerProfile.id);

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
          status,
          awarded_bid_id
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      accepted: "Accepted",
      rejected: "Rejected",
      completed: "Completed",
      withdrawn: "Withdrawn",
    };
    return labels[status] ?? status;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "accepted":
        return "text-green-500 dark:text-green-400";
      case "completed":
        return "text-green-700 dark:text-green-600";
      case "rejected":
        return "text-red-600 dark:text-red-400";
      case "withdrawn":
        return "text-gray-500 dark:text-gray-400";
      case "pending":
        return "text-gray-500 dark:text-gray-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
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

  const matchesFilter = (bid: Bid): boolean => {
    if (statusFilter === "all") return true;
    const cat = getBidCategory(bid);
    if (cat === "rejected") return statusFilter === "lose";
    if (cat === "completed") return statusFilter === "hired";
    return cat === statusFilter;
  };
  const filteredActiveBids = activeBids.filter(matchesFilter);
  const filteredPastBids = pastBids.filter(matchesFilter);
  const filteredBidsWhenNotAll = statusFilter !== "all" ? bids.filter(matchesFilter) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <StripeConnectBanner />
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-40 mb-2 rounded" />
              <Skeleton className="h-5 w-[320px] max-w-full rounded" />
            </div>
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
            <Skeleton className="h-8 w-12 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <div className="space-y-4" aria-busy="true" aria-label="Loading bids">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-6 w-[70%] max-w-[30ch] rounded" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 max-w-[85%] w-full rounded" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                      <Skeleton className="h-9 w-24 rounded-md" />
                      <Skeleton className="h-9 w-28 rounded-md" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <StripeConnectBanner />
          <header className="mb-8 flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-1.5 -ml-2 text-muted-foreground mb-2 min-h-[36px] sm:min-h-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                Back
              </Button>
              <h1 className="text-4xl font-bold mb-2">My Bids</h1>
              <p className="text-muted-foreground">
              {bids.length === 0
                ? "Proposals you’ve submitted. Open a bid to view the gig and messages."
                : `${bids.length} bid${bids.length === 1 ? "" : "s"} · newest first`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/browse-gigs")}>
                Browse gigs
              </Button>
            </div>
          </header>

          {bids.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
              <span className="text-xs font-medium text-muted-foreground mr-1 shrink-0">Filter:</span>
              {FILTER_OPTIONS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "min-h-[36px] sm:min-h-0 h-8 text-xs rounded-full touch-manipulation",
                    statusFilter === value && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}

          {bids.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No bids yet. Browse gigs and submit proposals.</p>
                <Button onClick={() => navigate("/browse-gigs")}>
                  Browse gigs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {statusFilter === "all" ? (
                <>
                  {filteredActiveBids.length > 0 && (
                    <section>
                      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Active
                      </h2>
                      <div className="space-y-4">
                        {filteredActiveBids.map((bid) => (
                          <BidRow
                            key={bid.id}
                            bid={bid}
                            diggerProfileId={diggerProfileId}
                            getStatusLabel={getStatusLabel}
                            getStatusClass={getStatusClass}
                            formatBudget={formatBudget}
                            formatDistanceToNow={formatDistanceToNow}
                            onView={() => navigate(`/gig/${bid.gigs.id}`)}
                            onDeclineSuccess={loadBids}
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
                      </div>
                    </section>
                  )}
                  {filteredPastBids.length > 0 && (
                    <section>
                      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Past
                      </h2>
                      <div className="space-y-4">
                        {filteredPastBids.map((bid) => (
                          <BidRow
                            key={bid.id}
                            bid={bid}
                            diggerProfileId={diggerProfileId}
                            getStatusLabel={getStatusLabel}
                            getStatusClass={getStatusClass}
                            formatBudget={formatBudget}
                            formatDistanceToNow={formatDistanceToNow}
                            onView={() => navigate(`/gig/${bid.gigs.id}`)}
                            onDeclineSuccess={loadBids}
                            WithdrawComponent={undefined}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <>
                  {filteredBidsWhenNotAll.length > 0 ? (
                    <section>
                      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        {FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label} ({filteredBidsWhenNotAll.length})
                      </h2>
                      <div className="space-y-4">
                        {filteredBidsWhenNotAll.map((bid) => (
                          <BidRow
                            key={bid.id}
                            bid={bid}
                            diggerProfileId={diggerProfileId}
                            getStatusLabel={getStatusLabel}
                            getStatusClass={getStatusClass}
                            formatBudget={formatBudget}
                            formatDistanceToNow={formatDistanceToNow}
                            onView={() => navigate(`/gig/${bid.gigs.id}`)}
                            onDeclineSuccess={loadBids}
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
                      </div>
                    </section>
                  ) : (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No bids in this category.
                    </p>
                  )}
                </>
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
  diggerProfileId,
  getStatusLabel,
  getStatusClass,
  formatBudget,
  formatDistanceToNow,
  onView,
  WithdrawComponent,
  onDeclineSuccess,
}: {
  bid: Bid;
  diggerProfileId: string | null;
  getStatusLabel: (s: string) => string;
  getStatusClass: (s: string) => string;
  formatBudget: (a: number | null, b: number | null) => string | null;
  formatDistanceToNow: (date: Date, opts: { addSuffix: boolean }) => string;
  onView: () => void;
  WithdrawComponent?: ReactNode;
  onDeclineSuccess?: () => void;
}) {
  const [declineLoading, setDeclineLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const gigStatus = bid.gigs?.status ?? "";
  const showOrangeChat =
    diggerProfileId &&
    (gigStatus === "in_progress" || gigStatus === "awarded" || gigStatus === "completed");
  const gigStatusLabel =
    gigStatus === "completed" ? "Completed" : gigStatus === "in_progress" ? "In progress" : gigStatus === "awarded" ? "Awarded" : gigStatus === "open" ? "Open" : gigStatus;
  const gigStatusClass = cn(
    "text-xs md:text-sm font-normal shrink-0",
    gigStatus === "open" && "text-violet-600 dark:text-violet-400",
    gigStatus === "in_progress" && "text-blue-600 dark:text-blue-400",
    gigStatus === "completed" && "text-green-700 dark:text-green-600",
    (gigStatus === "pending_confirmation" || gigStatus === "pending") && "text-gray-500 dark:text-gray-400",
    gigStatus === "awarded" && "text-green-500 dark:text-green-400",
    !["open", "in_progress", "completed", "awarded", "pending", "pending_confirmation"].includes(gigStatus) && "text-gray-500 dark:text-gray-400"
  );
  const awardedBidId = (bid.gigs as { awarded_bid_id?: string | null }).awarded_bid_id ?? null;
  const isThisBidAwarded = awardedBidId !== null && awardedBidId === bid.id;
  const isAwarded = isThisBidAwarded && gigStatus === "awarded";
  const isHired =
    isThisBidAwarded && (gigStatus === "in_progress" || gigStatus === "completed");
  const isLose =
    bid.status === "rejected" ||
    (awardedBidId !== null && awardedBidId !== bid.id);
  const rightBottomLabel = isHired
    ? "Hired"
    : isAwarded
      ? "Awarded"
      : isLose
        ? "Lose"
        : getStatusLabel(bid.status);
  const rightBottomClass = isHired
    ? "text-green-600 dark:text-green-500 font-medium"
    : isAwarded
      ? "text-amber-600 dark:text-amber-400 font-medium"
      : isLose
        ? "text-red-600 dark:text-red-400 font-medium"
        : getStatusClass(bid.status);
  const rightBottomTooltip = isHired
    ? "You were hired for this gig."
    : isAwarded
      ? "You were awarded this gig. Accept to get hired."
      : isLose
        ? "This gig was awarded to another digger."
        : null;

  const handleDeclineAward = async () => {
    if (!diggerProfileId || !onDeclineSuccess) return;
    if (!window.confirm("Decline this award? The client can choose someone else. You will be charged a $100 penalty.")) return;
    setDeclineLoading(true);
    try {
      await invokeEdgeFunction(supabase, "digger-decline-award", {
        body: { bidId: bid.id, gigId: bid.gigs.id, diggerId: diggerProfileId, reason: "Declined from My Bids" },
      });
      toast.success("Award declined. The client has been notified.");
      onDeclineSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to decline.");
    } finally {
      setDeclineLoading(false);
    }
  };

  const handleAcceptAward = async () => {
    if (!diggerProfileId || !onDeclineSuccess) return;
    setAcceptLoading(true);
    try {
      const data = await invokeEdgeFunction<{
        success?: boolean;
        alreadyAccepted?: boolean;
        requiresPayment?: boolean;
        checkoutUrl?: string;
        message?: string;
      }>(supabase, "digger-accept-award", {
        body: { bidId: bid.id, gigId: bid.gigs.id, diggerId: diggerProfileId },
      });
      if (data?.requiresPayment && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data?.success || data?.alreadyAccepted) {
        toast.success(data?.alreadyAccepted ? "Already accepted" : "You accepted the job! The client has been notified.");
        onDeclineSuccess();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to accept the award.");
    } finally {
      setAcceptLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-muted/20">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h3 className="text-xl font-semibold truncate max-w-[30ch]" title={bid.gigs.title}>
                  {bid.gigs.title.length > 30 ? `${bid.gigs.title.slice(0, 30)}…` : bid.gigs.title}
                </h3>
                {gigStatus && (
                  <span className={cn(gigStatusClass, "shrink-0")}>{gigStatusLabel}</span>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {rightBottomTooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn("text-xs font-normal cursor-default", rightBottomClass)}>
                        {rightBottomLabel}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[80vw] sm:max-w-none">
                      <p className="text-xs">{rightBottomTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className={cn("text-xs font-normal", rightBottomClass)}>
                    {rightBottomLabel}
                  </span>
                )}
              </div>
            </div>

            {bid.proposal && (
              <p className="text-muted-foreground mb-4 line-clamp-2">
                {bid.proposal.length > 150 ? `${bid.proposal.slice(0, 150).trim()}…` : bid.proposal}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Your bid: ${bid.amount.toLocaleString()}</span>
              </div>
              {formatBudget(bid.gigs.budget_min, bid.gigs.budget_max) && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Gig: {formatBudget(bid.gigs.budget_min, bid.gigs.budget_max)}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Bid {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action row: status (optional) + buttons */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-4">
          {bid.withdrawn_at != null && bid.withdrawal_penalty != null ? (
            <p className="text-xs text-muted-foreground">
              Withdrawn · ${bid.withdrawal_penalty.toFixed(2)} penalty · {formatDistanceToNow(new Date(bid.withdrawn_at), { addSuffix: true })}
            </p>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto">
            <Button variant="outline" onClick={onView} className="min-w-0">
              <FileText className="mr-2 h-4 w-4" />
              View gig
            </Button>
            {diggerProfileId && isThisBidAwarded && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "min-w-0 gap-1.5",
                  showOrangeChat &&
                    "bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:text-white hover:border-orange-600"
                )}
                onClick={() => {
                  setChatLoading(true);
                  openFloatingChat(bid.gigs.id, diggerProfileId);
                  setTimeout(() => setChatLoading(false), 1500);
                }}
                disabled={chatLoading}
                title="Chat with client"
              >
                {chatLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chat
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat
                  </>
                )}
              </Button>
            )}
            {isAwarded && onDeclineSuccess && (
              <>
                <Button
                  size="sm"
                  className="min-w-0 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleAcceptAward}
                  disabled={acceptLoading || declineLoading}
                  title="Accept this award and get hired"
                >
                  {acceptLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-0 gap-1.5 text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDeclineAward}
                  disabled={declineLoading || acceptLoading}
                  title="Decline this award (you will be charged a $100 penalty)"
                >
                  {declineLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Decline
                </Button>
              </>
            )}
            {WithdrawComponent}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MyBids;