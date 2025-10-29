import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, DollarSign, Calendar, Tag, Users, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  categories: {
    name: string;
  } | null;
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

const MyGigs = () => {
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [gigIssues, setGigIssues] = useState<LeadIssue[]>([]);
  const [showIssuesDialog, setShowIssuesDialog] = useState(false);

  useEffect(() => {
    loadGigs();
  }, []);

  const loadGigs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to view your gigs");
      navigate("/auth");
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
    }

    setLoading(false);
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
        <nav className="border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <h1 
              className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate("/")}
            >
              digsandgiggs
            </h1>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading your gigs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgiggs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Gigs</h1>
            <p className="text-muted-foreground">
              Manage your posted gigs and review lead requests
            </p>
          </div>
          <Button onClick={() => navigate("/post-gig")}>Post New Gig</Button>
        </div>

        {gigs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't posted any gigs yet.</p>
              <Button onClick={() => navigate("/post-gig")}>
                Post Your First Gig
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {gigs.map((gig) => (
              <Card key={gig.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
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

                    <div className="flex flex-col gap-3 items-end">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`status-${gig.id}`} className="text-sm">
                          {gig.status === "open" ? "Active" : "Closed"}
                        </Label>
                        <Switch
                          id={`status-${gig.id}`}
                          checked={gig.status === "open"}
                          onCheckedChange={() => toggleGigStatus(gig.id, gig.status)}
                        />
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewIssues(gig)}
                        className="w-full"
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        View Issues
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
