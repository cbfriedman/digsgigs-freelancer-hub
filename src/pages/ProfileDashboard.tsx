import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadReturnDialog } from "@/components/LeadReturnDialog";
import { 
  ArrowLeft, 
  Edit, 
  Eye, 
  Plus, 
  Key, 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw 
} from "lucide-react";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  profile_name: string | null;
  business_name: string;
  profession: string | null;
  profile_image_url: string | null;
  keywords: string[] | null;
  location: string;
  state: string | null;
  city: string | null;
  country: string | null;
}

interface LeadCredit {
  id: string;
  keyword: string;
  exclusivity_type: string;
  quantity_purchased: number;
  quantity_remaining: number;
  price_per_lead: number;
  total_paid: number;
  created_at: string;
  expires_at: string | null;
}

interface LeadPurchase {
  id: string;
  gig_id: string;
  purchase_price: number;
  amount_paid: number;
  exclusivity_type: string | null;
  status: string | null;
  purchased_at: string;
  gig: {
    title: string;
    description: string;
    is_confirmed_lead: boolean | null;
  } | null;
}

export default function ProfileDashboard() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [leadCredits, setLeadCredits] = useState<LeadCredit[]>([]);
  const [leadPurchases, setLeadPurchases] = useState<LeadPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (user && profileId) {
      loadData();
    }
  }, [user, profileId]);

  const loadData = async () => {
    if (!user || !profileId) return;

    try {
      setLoading(true);

      // Load profile, lead credits, and lead purchases in parallel
      const [profileResult, creditsResult, purchasesResult] = await Promise.all([
        supabase
          .from("digger_profiles")
          .select("id, profile_name, business_name, profession, profile_image_url, keywords, location, state, city, country")
          .eq("id", profileId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("lead_credits")
          .select("*")
          .eq("digger_profile_id", profileId)
          .order("created_at", { ascending: false }),
        supabase
          .from("lead_purchases")
          .select(`
            id,
            gig_id,
            purchase_price,
            amount_paid,
            exclusivity_type,
            status,
            purchased_at,
            gig:gigs(title, description, is_confirmed_lead)
          `)
          .eq("digger_id", profileId)
          .order("purchased_at", { ascending: false })
      ]);

      if (profileResult.error) throw profileResult.error;
      if (!profileResult.data) {
        toast.error("Profile not found");
        navigate("/my-profiles");
        return;
      }

      setProfile(profileResult.data);
      setLeadCredits(creditsResult.data || []);
      setLeadPurchases(purchasesResult.data?.map(p => ({
        ...p,
        gig: Array.isArray(p.gig) ? p.gig[0] : p.gig
      })) || []);
    } catch (error) {
      console.error("Error loading profile dashboard:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const getProfileDisplayName = () => {
    if (!profile) return "Profile";
    return profile.profile_name || profile.business_name || profile.profession || "Profile";
  };

  const getTotalCreditsRemaining = () => {
    return leadCredits.reduce((sum, credit) => sum + credit.quantity_remaining, 0);
  };

  const getTotalLeadsPurchased = () => {
    return leadPurchases.filter(p => p.status === "completed").length;
  };

  const getPendingPurchases = () => {
    return leadPurchases.filter(p => p.status === "pending");
  };

  const filteredPurchases = leadPurchases.filter(p => {
    if (statusFilter === "all") return true;
    return p.status === statusFilter;
  });

  const canReturnLead = (purchase: LeadPurchase) => {
    // Only allow returns for exclusive, semi-exclusive, or confirmed leads
    const exclusivityType = purchase.exclusivity_type?.toLowerCase() || "";
    const isConfirmed = purchase.gig?.is_confirmed_lead;
    const isCompleted = purchase.status === "completed";
    
    return isCompleted && (
      exclusivityType.includes("exclusive") || 
      exclusivityType.includes("semi") ||
      isConfirmed
    );
  };

  const getExclusivityBadgeVariant = (type: string | null) => {
    if (!type) return "outline";
    const lower = type.toLowerCase();
    if (lower.includes("24") || lower.includes("exclusive-24h")) return "default";
    if (lower.includes("semi")) return "secondary";
    return "outline";
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "refunded":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Group credits by keyword
  const creditsByKeyword = leadCredits.reduce((acc, credit) => {
    if (!acc[credit.keyword]) {
      acc[credit.keyword] = [];
    }
    acc[credit.keyword].push(credit);
    return acc;
  }, {} as Record<string, LeadCredit[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading profile dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate("/my-profiles")} 
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profiles
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              {profile.profile_image_url ? (
                <img 
                  src={profile.profile_image_url} 
                  alt={getProfileDisplayName()} 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-3xl font-bold text-muted-foreground">
                    {getProfileDisplayName()[0]}
                  </span>
                </div>
              )}

              {/* Profile Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{getProfileDisplayName()}</h1>
                <p className="text-muted-foreground">{profile.profession}</p>
                <p className="text-sm text-muted-foreground">
                  {[profile.city, profile.state, profile.country].filter(Boolean).join(", ") || profile.location}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-primary/10 rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">{getTotalLeadsPurchased()}</div>
                  <div className="text-xs text-muted-foreground">Leads Purchased</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{getTotalCreditsRemaining()}</div>
                  <div className="text-xs text-muted-foreground">Credits Remaining</div>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-600">{getPendingPurchases().length}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
              <Button onClick={() => navigate(`/edit-digger-profile?profileId=${profileId}`)} variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
              <Button onClick={() => navigate(`/pricing?profileId=${profileId}`)} variant="outline" className="gap-2">
                <Key className="h-4 w-4" />
                Manage Keywords
              </Button>
              <Button onClick={() => navigate(`/digger/${profileId}`)} variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                View Public Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="keywords" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="keywords">Keywords & Credits</TabsTrigger>
            <TabsTrigger value="purchases">Purchased Leads</TabsTrigger>
            <TabsTrigger value="pending">Pending ({getPendingPurchases().length})</TabsTrigger>
          </TabsList>

          {/* Keywords & Credits Tab */}
          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Keywords & Lead Credits</CardTitle>
                  <CardDescription>Your selected keywords and remaining lead credits</CardDescription>
                </div>
                <Button onClick={() => navigate(`/pricing?profileId=${profileId}`)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add More
                </Button>
              </CardHeader>
              <CardContent>
                {/* Keywords List */}
                {profile.keywords && profile.keywords.length > 0 ? (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-sm text-muted-foreground">Selected Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground mb-6">No keywords selected yet.</p>
                )}

                {/* Lead Credits */}
                {Object.keys(creditsByKeyword).length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Lead Credits by Keyword</h4>
                    {Object.entries(creditsByKeyword).map(([keyword, credits]) => (
                      <div key={keyword} className="border rounded-lg p-4">
                        <h5 className="font-semibold mb-3">{keyword}</h5>
                        <div className="space-y-2">
                          {credits.map((credit) => (
                            <div key={credit.id} className="flex items-center justify-between bg-muted/50 rounded p-3">
                              <div className="flex items-center gap-3">
                                <Badge variant={getExclusivityBadgeVariant(credit.exclusivity_type)}>
                                  {credit.exclusivity_type}
                                </Badge>
                                <span className="text-sm">
                                  {credit.quantity_remaining} / {credit.quantity_purchased} remaining
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ${credit.price_per_lead.toFixed(2)}/lead
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No lead credits purchased yet.</p>
                    <Button onClick={() => navigate(`/pricing?profileId=${profileId}`)} variant="link" className="mt-2">
                      Purchase lead credits
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchased Leads Tab */}
          <TabsContent value="purchases" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Purchased Leads History</CardTitle>
                  <CardDescription>All leads you've purchased for this profile</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {filteredPurchases.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPurchases.map((purchase) => (
                      <div key={purchase.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(purchase.status)}
                              <h5 className="font-semibold truncate">
                                {purchase.gig?.title || "Lead"}
                              </h5>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {purchase.gig?.description || "No description available"}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={getExclusivityBadgeVariant(purchase.exclusivity_type)}>
                                {purchase.exclusivity_type || "Standard"}
                              </Badge>
                              {purchase.gig?.is_confirmed_lead && (
                                <Badge variant="default" className="bg-green-600">Confirmed</Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                ${purchase.amount_paid.toFixed(2)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                • {new Date(purchase.purchased_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/gig/${purchase.gig_id}`)}
                            >
                              View Details
                            </Button>
                            {canReturnLead(purchase) && (
                              <LeadReturnDialog
                                leadPurchaseId={purchase.id}
                                gigTitle={purchase.gig?.title || "Lead"}
                                onSuccess={loadData}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No purchased leads yet.</p>
                    <Button onClick={() => navigate("/browse-gigs")} variant="link" className="mt-2">
                      Browse available gigs
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Purchases Tab */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Purchases</CardTitle>
                <CardDescription>Incomplete lead purchases that need attention</CardDescription>
              </CardHeader>
              <CardContent>
                {getPendingPurchases().length > 0 ? (
                  <div className="space-y-4">
                    {getPendingPurchases().map((purchase) => (
                      <div key={purchase.id} className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <h5 className="font-semibold truncate">
                                {purchase.gig?.title || "Pending Lead"}
                              </h5>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Amount: ${purchase.amount_paid.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Started: {new Date(purchase.purchased_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => navigate(`/checkout?gigId=${purchase.gig_id}`)}
                          >
                            Complete Purchase
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                    <p>No pending purchases. All caught up!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}