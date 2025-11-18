import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, DollarSign, Calendar, Mail, Phone, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Navigation } from "@/components/Navigation";
import { LeadReturnDialog } from "@/components/LeadReturnDialog";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { formatDistanceToNow } from "date-fns";

interface PurchasedLead {
  id: string;
  amount_paid: number;
  purchased_at: string;
  digger_id: string;
  status: string;
  gigs: {
    id: string;
    title: string;
    description: string;
    budget_min: number | null;
    budget_max: number | null;
    location: string;
    timeline: string | null;
    contact_preferences: string | null;
    profiles: {
      full_name: string | null;
      email: string;
    };
  };
  lead_issues: Array<{
    id: string;
    status: string;
  }>;
}

const MyLeads = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [leads, setLeads] = useState<PurchasedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');

  useEffect(() => {
    const handleBulkPurchaseSuccess = async () => {
      const sessionId = searchParams.get("session_id");
      const bulkPurchase = searchParams.get("bulk_purchase");
      
      if (bulkPurchase === "success" && sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke("process-bulk-purchase", {
            body: { sessionId },
          });

          if (error) throw error;

          toast.success(`Successfully purchased ${data.purchaseCount} leads!`);
          clearCart();
          loadLeads();
          
          // Clear query params
          window.history.replaceState({}, '', '/my-leads');
        } catch (error: any) {
          console.error("Error processing bulk purchase:", error);
          toast.error(error.message || "Failed to process purchases");
        }
      }
    };

    handleBulkPurchaseSuccess();
    loadLeads();
    checkSubscription();
  }, [searchParams]);

  const checkSubscription = async () => {
    try {
      const { data } = await supabase.functions.invoke('check-subscription');
      if (data?.tier) {
        setSubscriptionTier(data.tier);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const loadLeads = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to view your leads");
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

    // Get purchased leads (both completed and pending)
    const { data, error } = await supabase
      .from("lead_purchases")
      .select(`
        id,
        amount_paid,
        purchased_at,
        digger_id,
        status,
        gigs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          location,
          timeline,
          contact_preferences,
          profiles:profiles!gigs_consumer_id_fkey (
            full_name,
            email
          )
        ),
        lead_issues (
          id,
          status
        )
      `)
      .eq("digger_id", diggerProfile.id)
      .in("status", ["completed", "pending"])
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error("Error loading leads:", error);
      toast.error("Failed to load leads");
    } else {
      setLeads(data || []);
    }

    setLoading(false);
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return "";
  };

  const hasReportedIssue = (lead: PurchasedLead) => {
    return lead.lead_issues && lead.lead_issues.length > 0;
  };

  const getIssueStatus = (lead: PurchasedLead) => {
    if (!lead.lead_issues || lead.lead_issues.length === 0) return null;
    return lead.lead_issues[0].status;
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
              digsandgigs
            </h1>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading your leads...</p>
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
            digsandgigs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <SubscriptionBanner currentTier={subscriptionTier} />
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Purchased Leads</h1>
              <p className="text-muted-foreground">
                Manage and contact your purchased leads
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/lead-limits")}>
                Manage Lead Limits
              </Button>
              <Button variant="outline" onClick={() => navigate("/transactions")}>
                View Transaction History
              </Button>
            </div>
          </div>
        </div>

        {leads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't purchased any leads yet.</p>
              <Button onClick={() => navigate("/browse-gigs")}>
                Browse Available Gigs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {leads.map((lead) => (
              <Card key={lead.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">
                        {lead.gigs.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Paid ${lead.amount_paid.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Purchased {formatDistanceToNow(new Date(lead.purchased_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">Purchased</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Project Details</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {lead.gigs.description}
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{formatBudget(lead.gigs.budget_min, lead.gigs.budget_max)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.gigs.location}</span>
                          </div>
                          {lead.gigs.timeline && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{lead.gigs.timeline}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Mail className="h-5 w-5 text-primary" />
                          Client Contact Information
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                            <p className="font-medium">
                              {lead.gigs.profiles.full_name || "Not provided"}
                            </p>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg border border-border">
                            <p className="text-sm text-muted-foreground">
                              Contact information is protected. Use our platform messaging to communicate with the gig poster.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button 
                          className="w-full" 
                          onClick={() => toast.info("Platform messaging coming soon! For now, use the contact preferences specified by the gig poster.")}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Contact via Platform
                        </Button>

                        {hasReportedIssue(lead) ? (
                          <Button variant="outline" className="w-full" disabled>
                            Return Request {getIssueStatus(lead) === "pending" ? "Pending Review" : 
                                  getIssueStatus(lead) === "approved" ? "Approved" : "Rejected"}
                          </Button>
                        ) : (
                          <LeadReturnDialog
                            leadPurchaseId={lead.id}
                            gigTitle={lead.gigs.title}
                            onSuccess={() => loadLeads()}
                            buttonClassName="w-full gap-2"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLeads;
