import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Calendar, Users, AlertCircle, FileText, RefreshCw, Copy, Trash2, Loader2, Pencil, MessageSquare, Star, MoreVertical, MapPin, Clock, ArrowRight, Briefcase, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Navigation } from "@/components/Navigation";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { RatingDialog } from "@/components/RatingDialog";
import { cn } from "@/lib/utils";
import { openFloatingChat } from "@/lib/openFloatingChat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export type GigFilterOption = "all" | "open" | "awarded" | "in_progress" | "completed";

const GIG_FILTER_OPTIONS: { value: GigFilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "awarded", label: "Awarded" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

interface Gig {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  purchase_count: number;
  created_at: string;
  bumped_at?: string | null;
  consumer_id?: string | null;
  categories: {
    name: string;
  } | null;
  [key: string]: unknown;
}

interface LeadIssue {
  id: string;
  issue_type: string;
  description: string;
  status: string;
  created_at: string;
  refund_percentage: number;
  digger_profiles: {
    business_name: string;
  };
  lead_purchases: {
    amount_paid: number;
  };
}

type BidStats = { count: number; avgPrice: number };

export type AwardedDiggerInfo = {
  profile_image_url: string | null;
  full_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string | null;
};

type EscrowPreviewSummary = {
  contractStatus: string;
  completedMilestones: number;
  totalMilestones: number;
  totalPaid: number;
};

function getContractStatusLabel(s: string): string {
  const labels: Record<string, string> = { pending: "Pending", funded: "Funded", in_progress: "In progress", completed: "Completed" };
  return labels[s] ?? s;
}

function GigPreviewContent({
  gig,
  formatGigPrice,
  bidCount,
  onViewFull,
  escrowSummary,
}: {
  gig: Gig;
  formatGigPrice: (g: Gig) => string;
  bidCount: number;
  onViewFull: () => void;
  escrowSummary?: EscrowPreviewSummary | null;
}) {
  const statusLabel =
    gig.status === "completed"
      ? "Completed"
      : gig.status === "in_progress"
        ? "In progress"
        : gig.status === "awarded"
          ? "Awarded"
          : gig.status === "cancelled"
            ? "Closed"
            : gig.status;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1 flex items-center gap-1.5">
          <Briefcase className="h-4 w-4" />
          Description
        </h3>
        {gig.description ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{gig.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No description.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <DollarSign className="h-4 w-4 shrink-0" />
          <span>{formatGigPrice(gig)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>Posted {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}</span>
        </div>
        {gig.categories?.name && (
          <span className="text-muted-foreground">{gig.categories.name}</span>
        )}
      </div>
      {escrowSummary && (
        <div className="border-t border-border pt-4 space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Payment & milestones
          </h3>
          <p className="text-sm text-muted-foreground capitalize">Contract: {getContractStatusLabel(escrowSummary.contractStatus)}</p>
          <p className="text-sm text-muted-foreground">
            {escrowSummary.completedMilestones}/{escrowSummary.totalMilestones} milestones paid
            {escrowSummary.totalPaid > 0 && (
              <span className="ml-1"> · ${escrowSummary.totalPaid.toLocaleString()} released</span>
            )}
          </p>
        </div>
      )}
      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Status</p>
        <p className="text-sm capitalize">{statusLabel}</p>
        {bidCount > 0 && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <FileText className="h-4 w-4 shrink-0" />
            {bidCount} {bidCount === 1 ? "bid" : "bids"}
          </p>
        )}
      </div>
      <Button onClick={onViewFull} className="w-full gap-2 mt-4">
        {bidCount > 0 ? "View bids" : "View gig"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

const MyGigs = () => {
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [bidStatsByGigId, setBidStatsByGigId] = useState<Record<string, BidStats>>({});
  const [awardedDiggerByGigId, setAwardedDiggerByGigId] = useState<Record<string, AwardedDiggerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [previewGig, setPreviewGig] = useState<Gig | null>(null);
  const [previewEscrow, setPreviewEscrow] = useState<EscrowPreviewSummary | null>(null);
  const [gigIssues, setGigIssues] = useState<LeadIssue[]>([]);
  const [showIssuesDialog, setShowIssuesDialog] = useState(false);
  const [bumpingId, setBumpingId] = useState<string | null>(null);
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [repostConfirmGig, setRepostConfirmGig] = useState<Gig | null>(null);
  const [removeConfirmGig, setRemoveConfirmGig] = useState<Gig | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaveRefGig, setLeaveRefGig] = useState<Gig | null>(null);
  const [leaveRefDescription, setLeaveRefDescription] = useState("");
  const [leaveRefLoading, setLeaveRefLoading] = useState(false);
  const [platformRefGigIds, setPlatformRefGigIds] = useState<Set<string>>(new Set());
  const [reviewedGigIds, setReviewedGigIds] = useState<Set<string>>(new Set());
  const [leaveReviewGig, setLeaveReviewGig] = useState<Gig | null>(null);
  const [statusFilter, setStatusFilter] = useState<GigFilterOption>("all");
  const [chatLoadingGigId, setChatLoadingGigId] = useState<string | null>(null);

  useEffect(() => {
    loadGigs();
  }, []);

  useEffect(() => {
    if (!previewGig) {
      setPreviewEscrow(null);
      return;
    }
    if (!["awarded", "in_progress", "completed"].includes(previewGig.status)) {
      setPreviewEscrow(null);
      return;
    }
    const gigId = previewGig.id;
    let cancelled = false;
    (async () => {
      const { data: contract, error: contractError } = await supabase
        .from("escrow_contracts")
        .select("id, status")
        .eq("gig_id", gigId)
        .maybeSingle();
      if (cancelled) return;
      if (contractError || !contract) {
        setPreviewEscrow(null);
        return;
      }
      const { data: milestones, error: milestonesError } = await supabase
        .from("milestone_payments")
        .select("id, status, amount")
        .eq("escrow_contract_id", (contract as { id: string }).id)
        .order("milestone_number", { ascending: true });
      if (cancelled) return;
      if (milestonesError) {
        setPreviewEscrow(null);
        return;
      }
      const list = milestones ?? [];
      const paidCount = list.filter((m: { status: string }) => m.status === "paid").length;
      const totalPaid = list
        .filter((m: { status: string }) => m.status === "paid")
        .reduce((sum: number, m: { amount: number }) => sum + m.amount, 0);
      setPreviewEscrow({
        contractStatus: (contract as { status: string }).status,
        completedMilestones: paidCount,
        totalMilestones: list.length,
        totalPaid: Math.round(totalPaid * 100) / 100,
      });
    })();
    return () => { cancelled = true; };
  }, [previewGig?.id, previewGig?.status]);

  const loadGigs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to view your gigs");
      navigate("/register");
      return;
    }

    const { data, error } = await supabase
      .from("gigs")
      .select(`
        *,
        categories (name)
      `)
      .eq("consumer_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading gigs:", error);
      toast.error("Failed to load gigs");
    } else {
      setGigs(data || []);
      if ((data || []).length > 0) {
        const gigList = data as Gig[];
        loadBidStats(gigList.map((g: Gig) => g.id));
        loadPlatformRefGigIds(gigList);
        loadReviewedGigIds(gigList);
        loadAwardedDiggers(gigList);
      }
    }

    setLoading(false);
  };

  const loadAwardedDiggers = async (gigList: Gig[]) => {
    const gigsWithDigger = gigList.filter(
      (g) => (g as Gig & { awarded_digger_id?: string | null }).awarded_digger_id
    );
    if (gigsWithDigger.length === 0) {
      setAwardedDiggerByGigId({});
      return;
    }
    const diggerIds = [...new Set(gigsWithDigger.map((g) => (g as Gig & { awarded_digger_id?: string | null }).awarded_digger_id!))];
    const { data: diggers, error } = await supabase
      .from("digger_profiles")
      .select(`
        id,
        profile_image_url,
        city,
        state,
        country,
        profiles!digger_profiles_user_id_fkey (full_name, timezone)
      `)
      .in("id", diggerIds);
    if (error) {
      console.error("Error loading awarded diggers:", error);
      setAwardedDiggerByGigId({});
      return;
    }
    const byDiggerId: Record<string, AwardedDiggerInfo> = {};
    for (const d of diggers || []) {
      const p = (d as any).profiles;
      byDiggerId[d.id] = {
        profile_image_url: d.profile_image_url ?? null,
        full_name: p?.full_name ?? null,
        city: d.city ?? null,
        state: d.state ?? null,
        country: d.country ?? null,
        timezone: p?.timezone ?? null,
      };
    }
    const byGigId: Record<string, AwardedDiggerInfo> = {};
    for (const g of gigsWithDigger) {
      const diggerId = (g as Gig & { awarded_digger_id?: string | null }).awarded_digger_id;
      if (diggerId && byDiggerId[diggerId]) byGigId[g.id] = byDiggerId[diggerId];
    }
    setAwardedDiggerByGigId(byGigId);
  };

  const loadPlatformRefGigIds = async (gigList: Gig[]) => {
    const completedWithDigger = gigList.filter(
      (g) => g.status === "completed" && (g as Gig & { awarded_digger_id?: string | null }).awarded_digger_id
    );
    if (completedWithDigger.length === 0) {
      setPlatformRefGigIds(new Set());
      return;
    }
    const { data: refs } = await (supabase
      .from("references" as any))
      .select("gig_id")
      .in("gig_id", completedWithDigger.map((g) => g.id))
      .eq("verification_tier", "platform");
    const ids = new Set((refs || []).map((r: any) => r.gig_id));
    setPlatformRefGigIds(ids);
  };

  const loadReviewedGigIds = async (gigList: Gig[]) => {
    const completedWithDigger = gigList.filter(
      (g) => g.status === "completed" && (g as Gig & { awarded_digger_id?: string | null }).awarded_digger_id
    );
    if (completedWithDigger.length === 0) {
      setReviewedGigIds(new Set());
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setReviewedGigIds(new Set());
      return;
    }
    const { data: ratings } = await supabase
      .from("ratings")
      .select("gig_id")
      .in("gig_id", completedWithDigger.map((g) => g.id))
      .eq("consumer_id", user.id);
    const ids = new Set((ratings || []).map((r: { gig_id: string } | null) => r?.gig_id).filter(Boolean) as string[]);
    setReviewedGigIds(ids);
  };

  const loadBidStats = async (gigIds: string[]) => {
    const { data: bids, error } = await supabase
      .from("bids")
      .select("gig_id, amount, amount_min, amount_max")
      .in("gig_id", gigIds);

    if (error || !bids?.length) {
      setBidStatsByGigId({});
      return;
    }

    const stats: Record<string, BidStats> = {};
    for (const gigId of gigIds) {
      const gigBids = bids.filter((b: { gig_id: string }) => b.gig_id === gigId);
      const count = gigBids.length;
      const avgPrice =
        count > 0
          ? gigBids.reduce((sum: number, b: { amount_min?: number; amount_max?: number; amount: number }) => {
              if (b.amount_min != null && b.amount_max != null) return sum + (b.amount_min + b.amount_max) / 2;
              return sum + (b.amount_min ?? b.amount_max ?? b.amount);
            }, 0) / count
          : 0;
      stats[gigId] = { count, avgPrice };
    }
    setBidStatsByGigId(stats);
  };

  const toggleGigStatus = async (gigId: string, currentStatus: string, newChecked: boolean) => {
    // Only allow open <-> cancelled (closed); DB constraint allows 'cancelled', not 'closed'
    const isToggleable = currentStatus === "open" || currentStatus === "cancelled";
    if (!isToggleable) {
      toast.error("This gig can't be reopened once it's in progress or completed.");
      return;
    }
    const newStatus = newChecked ? "open" : "cancelled";

    // Optimistic update so the Switch reflects the new state immediately
    setGigs((prev) =>
      prev.map((g) => (g.id === gigId ? { ...g, status: newStatus } : g))
    );

    const { error } = await supabase
      .from("gigs")
      .update({ status: newStatus })
      .eq("id", gigId);

    if (error) {
      // Revert optimistic update on failure
      setGigs((prev) =>
        prev.map((g) => (g.id === gigId ? { ...g, status: currentStatus } : g))
      );
      toast.error("Failed to update gig status");
    } else {
      toast.success(`Gig ${newStatus === "open" ? "reopened" : "closed for new bids"} successfully`);
      loadGigs();
    }
  };

  const handleBump = async (gigId: string) => {
    setBumpingId(gigId);
    const { error } = await supabase
      .from("gigs")
      .update({ bumped_at: new Date().toISOString() } as any)
      .eq("id", gigId);

    setBumpingId(null);
    if (error) {
      toast.error("Failed to bump listing");
    } else {
      toast.success("Listing bumped to the top. More diggers will see it.");
      loadGigs();
    }
  };

  const handleRepostConfirm = () => {
    if (!repostConfirmGig) return;
    handleRepost(repostConfirmGig);
    setRepostConfirmGig(null);
  };

  const handleRepost = async (gig: Gig) => {
    const consumerId = (gig as Gig & { consumer_id?: string | null }).consumer_id;
    if (!consumerId) {
      toast.error("Sign in with the account that posted this gig to repost.");
      return;
    }

    setRepostingId(gig.id);
    const row = gig as Record<string, unknown>;
    const isHourly = row.project_type === "hourly";
    const insertPayload: Record<string, unknown> = {
      title: row.title,
      description: row.description,
      timeline: row.timeline ?? null,
      location: row.location ?? "Remote",
      category_id: row.category_id ?? null,
      consumer_id: consumerId,
      requirements: row.requirements ?? null,
      preferred_regions: Array.isArray(row.preferred_regions) ? row.preferred_regions : null,
      status: "open",
      consumer_email: row.consumer_email ?? null,
      client_name: row.client_name ?? null,
      consumer_phone: row.consumer_phone ?? null,
      confirmation_status: "confirmed",
      is_confirmed_lead: true,
      project_type: isHourly ? "hourly" : "fixed",
    };
    if (isHourly) {
      insertPayload.budget_min = null;
      insertPayload.budget_max = null;
      insertPayload.hourly_rate_min = row.hourly_rate_min ?? null;
      insertPayload.hourly_rate_max = row.hourly_rate_max ?? null;
      insertPayload.estimated_hours_min = row.estimated_hours_min ?? null;
      insertPayload.estimated_hours_max = row.estimated_hours_max ?? null;
    } else {
      insertPayload.budget_min = row.budget_min ?? null;
      insertPayload.budget_max = row.budget_max ?? null;
    }

    const { data: newGig, error } = await supabase
      .from("gigs")
      .insert(insertPayload as any)
      .select("id")
      .single();

    setRepostingId(null);
    setRepostConfirmGig(null);

    if (error) {
      toast.error("Failed to repost. Try again.");
      return;
    }

    toast.success("Reposted! Your new listing is live.");
    supabase.functions.invoke("send-gig-email-by-settings", { body: { gigId: newGig.id } }).catch(() => {});
    loadGigs();
    navigate(`/gig/${newGig.id}`);
  };

  const handleRemoveGig = async (gig: Gig) => {
    const awardedDiggerId = (gig as Gig & { awarded_digger_id?: string | null }).awarded_digger_id;
    if (awardedDiggerId) {
      toast.error("Cannot remove a project that has already been awarded to a Digger.");
      setRemoveConfirmGig(null);
      return;
    }
    setRemovingId(gig.id);
    const { error } = await supabase.from("gigs").delete().eq("id", gig.id);
    setRemovingId(null);
    setRemoveConfirmGig(null);
    if (error) {
      toast.error("Failed to remove project.");
      return;
    }
    toast.success("Project removed permanently.");
    loadGigs();
  };

  const handleSubmitPlatformReference = async () => {
    if (!leaveRefGig) return;
    const awardedDiggerId = (leaveRefGig as Gig & { awarded_digger_id?: string | null }).awarded_digger_id;
    if (!awardedDiggerId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.user.id)
      .single();

    const referenceName = (profile?.full_name || session.user.email || "Client").trim() || "Client";
    const referenceEmail = (profile?.email || session.user.email || "").trim();
    if (!referenceEmail) {
      toast.error("Please add an email to your profile to leave a reference.");
      return;
    }

    setLeaveRefLoading(true);
    const gigIdForRef = leaveRefGig.id;
    try {
      const { error } = await supabase.from("references").insert({
        digger_id: awardedDiggerId,
        gig_id: leaveRefGig.id,
        reference_name: referenceName,
        reference_email: referenceEmail,
        project_description: leaveRefDescription.trim() || null,
        verification_tier: "platform",
        is_verified: true,
      });
      if (error) {
        // 23505 = unique_violation (one platform reference per digger+gig); treat as already left
        if (error.code === "23505") {
          setLeaveRefGig(null);
          setLeaveRefDescription("");
          setPlatformRefGigIds((prev) => new Set(prev).add(gigIdForRef));
          toast.info("You've already left a reference for this gig. It's shown as \"Reference left\".");
          return;
        }
        throw error;
      }

      // Notify the digger that they received a reference (edge function uses service role to insert)
      try {
        await supabase.functions.invoke("notify-digger-reference-received", {
          body: { gigId: gigIdForRef },
        });
      } catch (_) {
        // Non-blocking: reference was saved; notification is best-effort
      }

      toast.success("Reference added. It will show as \"Verified on DigsandGigs\" on the Digger's profile.");
      setLeaveRefGig(null);
      setLeaveRefDescription("");
      setPlatformRefGigIds((prev) => new Set(prev).add(gigIdForRef));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add reference.");
    } finally {
      setLeaveRefLoading(false);
    }
  };

  const viewIssues = async (gig: Gig) => {
    setSelectedGig(gig);
    
    const { data, error } = await supabase
      .from("lead_issues")
      .select(`
        *,
        lead_purchases!inner(gig_id, amount_paid),
        digger_profiles!inner(business_name)
      `)
      .eq("lead_purchases.gig_id", gig.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading issues:", error);
      toast.error("Failed to load issues");
    } else {
      setGigIssues(data || []);
      setShowIssuesDialog(true);
    }
  };

  const handleIssueResolution = async (issueId: string, approved: boolean) => {
    const { error } = await supabase
      .from("lead_issues")
      .update({
        status: approved ? "approved" : "rejected",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", issueId);

    if (error) {
      toast.error("Failed to update issue");
    } else {
      toast.success(`Issue ${approved ? "approved" : "rejected"}`);
      if (selectedGig) {
        viewIssues(selectedGig);
      }
    }
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return "";
  };

  const formatGigPrice = (gig: Gig) => {
    if ((gig as { project_type?: string }).project_type === "hourly") {
      const rMin = (gig as { hourly_rate_min?: number | null }).hourly_rate_min ?? 0;
      const rMax = (gig as { hourly_rate_max?: number | null }).hourly_rate_max ?? rMin;
      if (!rMin && !rMax) return "Rate not specified";
      if (rMin && rMax && rMin !== rMax) return `$${Math.round(rMin)}–${Math.round(rMax)}/hr`;
      return `$${Math.round(rMax || rMin)}/hr`;
    }
    return formatBudget(gig.budget_min, gig.budget_max);
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mistake: "Posted by Mistake",
      changed_mind: "Changed Mind",
      already_filled: "Already Found Digger",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-0 pb-4 sm:py-6 max-w-5xl md:ml-48 md:mr-auto">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <nav
              aria-hidden="true"
              className="fixed left-0 right-0 top-[var(--header-height)] z-10 bg-background border-b border-border/60 md:bottom-0 md:right-auto md:w-48 md:border-r md:border-border/60 md:border-b-0 shrink-0 md:pt-1 px-4 py-2 md:py-0"
            >
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 md:flex-col md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0">
                {GIG_FILTER_OPTIONS.map(({ value }) => (
                  <Skeleton key={value} className="h-8 w-14 md:w-full md:max-w-[7rem] rounded-md" />
                ))}
              </div>
            </nav>
            <div className="flex-1 min-w-0 pt-12 md:pt-0">
              <div className="space-y-4" aria-busy="true" aria-label="Loading your gigs">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-0 pb-4 sm:py-6 max-w-5xl md:ml-48 md:mr-auto">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {gigs.length > 0 && (
            <nav
              aria-label="Filter gigs"
              className="fixed left-0 right-0 top-[var(--header-height)] z-10 bg-background border-b border-border/60 md:bottom-0 md:right-auto md:w-48 md:border-r md:border-border/60 md:border-b-0 shrink-0 md:pt-1 px-4 py-2 md:py-0"
            >
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 md:flex-col md:overflow-visible md:border-b-0 -mx-4 px-4 md:mx-0 md:px-0">
                {GIG_FILTER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={cn(
                      "text-left px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors md:py-1.5 hover:bg-muted",
                      statusFilter === value
                        ? "bg-muted text-foreground font-medium md:border-l-2 md:border-l-muted-foreground/50 md:pl-3 md:ml-0 hover:text-foreground"
                        : "text-muted-foreground hover:text-foreground md:border-l-2 md:border-l-transparent md:pl-3"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </nav>
          )}
          <div className={cn("flex-1 min-w-0", gigs.length > 0 && "pt-20 md:pt-0")}>
        {gigs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Post your first gig. Diggers are waiting to bid.</p>
              <Button onClick={() => navigate("/post-gig?quick=1")}>
                Post a gig
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 pt-4 md:pt-0">
            {(statusFilter === "all"
              ? gigs
              : gigs.filter((g) => g.status === statusFilter)
            ).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No gigs in this category.
              </p>
            ) : (
            (statusFilter === "all" ? gigs : gigs.filter((g) => g.status === statusFilter)).map((gig) => (
              <Card
                key={gig.id}
                className={cn(
                  "group overflow-hidden transition-all duration-200 w-full min-w-0 max-w-full",
                  previewGig?.id === gig.id
                    ? "ring-2 ring-primary border-primary/50 shadow-md"
                    : "hover:shadow-md hover:border-primary/30 hover:bg-muted/20 cursor-pointer"
                )}
                onClick={() => setPreviewGig(gig)}
              >
                <CardContent className="p-4 sm:p-6 overflow-hidden">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 min-w-0">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 mb-3 min-w-0">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 min-w-0 flex-1">
                          <h3 className="text-base sm:text-xl font-semibold line-clamp-2 break-words min-w-0 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400" title={gig.title}>
                            {gig.title}
                          </h3>
                          <span className={cn(
                            "text-xs font-normal shrink-0 self-start sm:self-auto",
                            gig.status === "open" && "text-primary",
                            gig.status === "in_progress" && "text-blue-600 dark:text-blue-400",
                            gig.status === "completed" && "text-green-700 dark:text-green-600",
                            (gig.status === "pending_confirmation" || gig.status === "pending") && "text-gray-500 dark:text-gray-400",
                            gig.status === "awarded" && "text-green-500 dark:text-green-400",
                            gig.status === "cancelled" && "text-gray-500 dark:text-gray-400",
                            !["open", "in_progress", "completed", "awarded", "pending", "pending_confirmation", "cancelled"].includes(gig.status) && "text-gray-500 dark:text-gray-400"
                          )}>
                            {gig.status === "completed" ? "Completed" : gig.status === "in_progress" ? "In progress" : gig.status === "awarded" ? "Awarded" : gig.status === "cancelled" ? "Closed" : gig.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                        {gig.purchase_count > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3 shrink-0" />
                            {gig.purchase_count} {gig.purchase_count === 1 ? "purchase" : "purchases"}
                          </span>
                        )}
                        {bidStatsByGigId[gig.id]?.count != null && bidStatsByGigId[gig.id].count > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{bidStatsByGigId[gig.id].count} {bidStatsByGigId[gig.id].count === 1 ? "bid" : "bids"}
                            {bidStatsByGigId[gig.id].avgPrice > 0 && (
                              <span className="opacity-80"> · Avg ${Math.round(bidStatsByGigId[gig.id].avgPrice).toLocaleString()}</span>
                            )}</span>
                          </span>
                        )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 w-full justify-end sm:w-auto sm:ml-auto" onClick={(e) => e.stopPropagation()}>
                          {(gig.status === "open" || gig.status === "cancelled") && (
                            <>
                              <Label htmlFor={`status-${gig.id}`} className="text-sm whitespace-nowrap">
                                {gig.status === "open" ? "Active" : "Closed"}
                              </Label>
                              <Switch
                                id={`status-${gig.id}`}
                                checked={gig.status === "open"}
                                onCheckedChange={(checked) => toggleGigStatus(gig.id, gig.status, checked)}
                              />
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="More actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {gig.status !== "completed" && (
                                <DropdownMenuItem onClick={() => navigate(`/gig/${gig.id}/edit`)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {gig.status === "completed" &&
                                (gig as Gig & { awarded_digger_id?: string | null }).awarded_digger_id &&
                                (platformRefGigIds.has(gig.id) ? (
                                  <DropdownMenuItem disabled>
                                    <MessageSquare className="mr-2 h-4 w-4 opacity-60" />
                                    Reference left
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setLeaveRefGig(gig);
                                      setLeaveRefDescription("");
                                    }}
                                  >
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Leave reference
                                  </DropdownMenuItem>
                                ))}
                              {gig.status === "completed" &&
                                (gig as Gig & { awarded_digger_id?: string | null }).awarded_digger_id &&
                                !reviewedGigIds.has(gig.id) && (
                                  <DropdownMenuItem onClick={() => setLeaveReviewGig(gig)}>
                                    <Star className="mr-2 h-4 w-4" />
                                    Leave review
                                  </DropdownMenuItem>
                                )}
                              {gig.status === "open" && (
                                <DropdownMenuItem
                                  onClick={() => handleBump(gig.id)}
                                  disabled={!!bumpingId}
                                >
                                  {bumpingId === gig.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                  )}
                                  Bump
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setRepostConfirmGig(gig)}
                                disabled={!!repostingId || !(gig as Gig & { consumer_id?: string | null }).consumer_id}
                              >
                                {repostingId === gig.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Copy className="mr-2 h-4 w-4" />
                                )}
                                Repost
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => viewIssues(gig)}>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                View Issues
                              </DropdownMenuItem>
                              {!(gig as Gig & { awarded_digger_id?: string | null }).awarded_digger_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setRemoveConfirmGig(gig)}
                                    disabled={!!removingId}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    {removingId === gig.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Remove
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-4 line-clamp-2 text-sm break-words overflow-hidden">
                        {gig.description.length > 150 ? `${gig.description.slice(0, 150).trim()}…` : gig.description}
                      </p>

                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:gap-4 text-xs sm:text-sm min-w-0">
                        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                          <DollarSign className="h-4 w-4 shrink-0" />
                          <span className="truncate">{formatGigPrice(gig)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>Posted {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action row: hired digger info (left) + View bids & Chat (right) */}
                  <div className="mt-4 pt-4 border-t flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                    {(gig.status === "in_progress" || gig.status === "awarded" || gig.status === "completed") &&
                      awardedDiggerByGigId[gig.id] && (() => {
                        const info = awardedDiggerByGigId[gig.id];
                        const localTimeStr = info.timezone?.trim()
                          ? (() => {
                              try {
                                return new Intl.DateTimeFormat("en-US", {
                                  timeZone: info.timezone.trim(),
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                  timeZoneName: "short",
                                }).format(new Date());
                              } catch {
                                return null;
                              }
                            })()
                          : null;
                        const locationParts = [info.city, info.state, info.country].filter(Boolean);
                        const locationStr = locationParts.length > 0 ? locationParts.join(", ") : null;
                        return (
                          <div className="flex items-center gap-3 min-w-0 overflow-hidden w-full sm:w-auto">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={info.profile_image_url ?? undefined} alt="" />
                              <AvatarFallback className="text-sm bg-muted">
                                {(info.full_name || "D").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex flex-col gap-0.5 text-sm overflow-hidden">
                              <span className="font-medium truncate">{info.full_name || "Hired Digger"}</span>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground min-w-0">
                                {localTimeStr != null && (
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    {localTimeStr}
                                  </span>
                                )}
                                {locationStr && (
                                  <span className="flex items-center gap-1 min-w-0 truncate">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {locationStr}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0 max-w-full sm:ml-auto justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/gig/${gig.id}`)}
                        className="min-w-0 min-h-9 shrink-0"
                      >
                        <FileText className="mr-2 h-4 w-4 shrink-0" />
                        {bidStatsByGigId[gig.id]?.count ? "View bids" : "View gig"}
                      </Button>
                      {(gig.status === "in_progress" || gig.status === "awarded" || gig.status === "completed") &&
                        (gig as Gig & { awarded_digger_id?: string | null }).awarded_digger_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-0 min-h-9 gap-1.5 shrink-0 bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:text-white hover:border-orange-600"
                            onClick={() => {
                              setChatLoadingGigId(gig.id);
                              openFloatingChat(gig.id, (gig as Gig & { awarded_digger_id?: string | null }).awarded_digger_id!);
                              setTimeout(() => setChatLoadingGigId(null), 1500);
                            }}
                            disabled={chatLoadingGigId === gig.id}
                            title="Chat with the hired Digger"
                          >
                            {chatLoadingGigId === gig.id ? (
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            )))}
          </div>
        )}
          </div>
        </div>
      </div>

      <Sheet open={!!previewGig} onOpenChange={(open) => !open && setPreviewGig(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 overflow-hidden">
          <SheetHeader className="p-4 pb-2 border-b shrink-0">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-muted p-2 shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-left line-clamp-2">{previewGig?.title}</SheetTitle>
                <SheetDescription className="text-left mt-0.5">
                  Gig details. Open the full gig to manage bids and chat.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {previewGig && (
              <GigPreviewContent
                gig={previewGig}
                formatGigPrice={formatGigPrice}
                bidCount={bidStatsByGigId[previewGig.id]?.count ?? 0}
                onViewFull={() => {
                  navigate(`/gig/${previewGig.id}`);
                  setPreviewGig(null);
                }}
                escrowSummary={previewEscrow}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!repostConfirmGig} onOpenChange={(open) => !open && setRepostConfirmGig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Repost this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              A new listing will be created with the same title, description, and budget. Your current listing stays as is. Diggers will be notified about the new post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRepostConfirm}>Repost</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeConfirmGig} onOpenChange={(open) => !open && setRemoveConfirmGig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this project permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This project will be deleted completely from the database and will no longer appear anywhere. Bids and related data will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeConfirmGig && handleRemoveGig(removeConfirmGig)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {leaveReviewGig && (
        <RatingDialog
          open={!!leaveReviewGig}
          onOpenChange={(open) => {
            if (!open) setLeaveReviewGig(null);
          }}
          diggerId={(leaveReviewGig as Gig & { awarded_digger_id?: string | null }).awarded_digger_id!}
          gigId={leaveReviewGig.id}
          gigTitle={leaveReviewGig.title}
          onSuccess={() => {
            setReviewedGigIds((prev) => new Set(prev).add(leaveReviewGig.id));
            setLeaveReviewGig(null);
          }}
        />
      )}

      <Dialog open={!!leaveRefGig} onOpenChange={(open) => !open && setLeaveRefGig(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a reference</DialogTitle>
            <DialogDescription>
              Your reference will appear on the Digger&apos;s profile as &quot;Verified on DigsandGigs&quot; and helps other Giggers trust their experience. This comes from your completed gig on the platform.
            </DialogDescription>
          </DialogHeader>
          {leaveRefGig && (
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium">Gig: {leaveRefGig.title}</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project description (optional)</label>
                <Textarea
                  value={leaveRefDescription}
                  onChange={(e) => setLeaveRefDescription(e.target.value)}
                  placeholder="Brief note about the project or your experience"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLeaveRefGig(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitPlatformReference} disabled={leaveRefLoading}>
              {leaveRefLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {leaveRefLoading ? "Adding..." : "Submit reference"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showIssuesDialog} onOpenChange={setShowIssuesDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Lead Issues for "{selectedGig?.title}"</AlertDialogTitle>
            <AlertDialogDescription>
              Review and resolve reported issues from diggers
            </AlertDialogDescription>
          </AlertDialogHeader>

          {gigIssues.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No issues reported for this gig
            </div>
          ) : (
            <div className="space-y-4">
              {gigIssues.map((issue) => (
                <Card key={issue.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{getIssueTypeLabel(issue.issue_type)}</p>
                        <p className="text-sm text-muted-foreground">
                          From: {issue.digger_profiles.business_name}
                        </p>
                      </div>
                      <Badge variant={
                        issue.status === "pending" ? "secondary" :
                        issue.status === "approved" ? "default" : "outline"
                      }>
                        {issue.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-3">{issue.description}</p>
                    <div className="flex gap-4 text-sm mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount Paid</p>
                        <p className="font-medium">${issue.lead_purchases.amount_paid.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Refund Amount</p>
                        <p className="font-medium text-primary">
                          ${((issue.lead_purchases.amount_paid * issue.refund_percentage) / 100).toFixed(2)} 
                          ({issue.refund_percentage}%)
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Reported {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                    </p>
                    
                    {issue.status === "pending" && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleIssueResolution(issue.id, true)}
                        >
                          Approve Refund
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleIssueResolution(issue.id, false)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyGigs;
