import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Calendar, Tag, Users, AlertCircle, FileText, RefreshCw, Copy } from "lucide-react";
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

const MyGigs = () => {
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [bidStatsByGigId, setBidStatsByGigId] = useState<Record<string, BidStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [gigIssues, setGigIssues] = useState<LeadIssue[]>([]);
  const [showIssuesDialog, setShowIssuesDialog] = useState(false);
  const [bumpingId, setBumpingId] = useState<string | null>(null);
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [repostConfirmGig, setRepostConfirmGig] = useState<Gig | null>(null);

  useEffect(() => {
    loadGigs();
  }, []);

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
        loadBidStats(data.map((g: Gig) => g.id));
      }
    }

    setLoading(false);
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

  const toggleGigStatus = async (gigId: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "closed" : "open";
    
    const { error } = await supabase
      .from("gigs")
      .update({ status: newStatus })
      .eq("id", gigId);

    if (error) {
      toast.error("Failed to update gig status");
    } else {
      toast.success(`Gig ${newStatus === "open" ? "reopened" : "closed"} successfully`);
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
    const insertPayload = {
      title: row.title,
      description: row.description,
      budget_min: row.budget_min ?? null,
      budget_max: row.budget_max ?? null,
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
    };

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

    toast.success("Reposted! Your new listing is live and diggers will be notified.");
    loadGigs();

    supabase.functions.invoke("blast-lead-to-diggers", { body: { leadId: newGig.id, proOnly: true } }).catch(() => {});
    supabase.functions.invoke("blast-lead-to-diggers", { body: { leadId: newGig.id, proOnly: false } }).catch(() => {});

    navigate(`/gig/${newGig.id}`);
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
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading your gigs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Gigs</h1>
            <p className="text-muted-foreground">
              Your gigs are live. Review bids from Diggers in real time and award when you're ready.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/transactions")}>
              View Transactions
            </Button>
            <Button onClick={() => navigate("/post-gig")}>Post New Gig</Button>
          </div>
        </div>

        {gigs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Post your first gig. Diggers are waiting to bid.</p>
              <Button onClick={() => navigate("/post-gig")}>
                Post a gig
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {gigs.map((gig) => (
              <Card key={gig.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-xl font-semibold">{gig.title}</h3>
                        <Badge variant={gig.status === "open" ? "secondary" : "outline"}>
                          {gig.status}
                        </Badge>
                        {gig.purchase_count > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {gig.purchase_count} {gig.purchase_count === 1 ? "purchase" : "purchases"}
                          </Badge>
                        )}
                        {bidStatsByGigId[gig.id]?.count != null && bidStatsByGigId[gig.id].count > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {bidStatsByGigId[gig.id].count} {bidStatsByGigId[gig.id].count === 1 ? "bid" : "bids"}
                            {bidStatsByGigId[gig.id].avgPrice > 0 && (
                              <span className="opacity-80"> · Avg ${Math.round(bidStatsByGigId[gig.id].avgPrice).toLocaleString()}</span>
                            )}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {gig.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        {gig.categories && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Tag className="h-4 w-4" />
                            <span>{gig.categories.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatBudget(gig.budget_min, gig.budget_max)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Posted {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor={`status-${gig.id}`} className="text-sm whitespace-nowrap">
                        {gig.status === "open" ? "Active" : "Closed"}
                      </Label>
                      <Switch
                        id={`status-${gig.id}`}
                        checked={gig.status === "open"}
                        onCheckedChange={() => toggleGigStatus(gig.id, gig.status)}
                      />
                    </div>
                  </div>

                  {/* Action row: View, Bump, Repost, Issues */}
                  <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-2 flex-wrap">
                    <Button
                      onClick={() => navigate(`/gig/${gig.id}`)}
                      className="flex-1 min-w-0"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {bidStatsByGigId[gig.id]?.count ? "View bids" : "View gig"}
                    </Button>
                    {gig.status === "open" && (
                      <Button
                        variant="outline"
                        onClick={() => handleBump(gig.id)}
                        disabled={!!bumpingId}
                        className="min-w-0"
                        title="Bump this listing to the top so more diggers see it"
                      >
                        {bumpingId === gig.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Bump
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setRepostConfirmGig(gig)}
                      disabled={!!repostingId || !(gig as Gig & { consumer_id?: string | null }).consumer_id}
                      className="min-w-0"
                      title="Create a new listing with the same details (diggers will be notified)"
                    >
                      {repostingId === gig.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      Repost
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => viewIssues(gig)}
                      className="flex-1 min-w-0"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      View Issues
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
