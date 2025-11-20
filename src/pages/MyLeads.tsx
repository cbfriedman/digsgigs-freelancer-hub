import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Calendar, DollarSign, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { LeadReturnDialog } from "@/components/LeadReturnDialog";
import { formatDistanceToNow } from "date-fns";

export default function MyLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProfile) {
      loadLeads();
      
      // Set up real-time subscription for new leads
      const channel = supabase
        .channel('lead-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'lead_purchases',
            filter: `digger_id=eq.${selectedProfile}`
          },
          (payload) => {
            console.log('New lead received:', payload);
            loadLeads();
            toast.success("New lead received!");
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, selectedProfile]);

  const loadProfiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("digger_profiles")
        .select("id, business_name, profile_name, monthly_lead_count")
        .eq("user_id", user.id)
        .eq("registration_status", "complete")
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setProfiles(data);
        setSelectedProfile(data[0].id);
      }
    } catch (error: any) {
      console.error("Error loading profiles:", error);
      toast.error("Failed to load profiles");
    }
  };

  const loadLeads = async () => {
    if (!user || !selectedProfile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lead_purchases")
        .select(`
          *,
          gigs (
            id,
            title,
            description,
            location,
            budget_min,
            budget_max,
            created_at,
            status,
            deadline,
            profiles!gigs_consumer_id_fkey (
              full_name,
              email
            )
          ),
          digger_profiles!lead_purchases_digger_id_fkey (
            id,
            business_name,
            profile_name
          )
        `)
        .eq("digger_id", selectedProfile)
        .order("purchased_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error("Error loading leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const isExclusivePeriod = (purchasedAt: string) => {
    const purchaseTime = new Date(purchasedAt);
    const now = new Date();
    const hoursSince = (now.getTime() - purchaseTime.getTime()) / (1000 * 60 * 60);
    return hoursSince < 24;
  };

  const getProfileDisplayName = (profile: any) => {
    return profile?.profile_name || profile?.business_name || "Unknown Profile";
  };

  return (
    <>
      <SEOHead 
        title="My Leads - Digsandgigs"
        description="View and manage your purchased leads"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Leads</h1>
            <p className="text-muted-foreground">
              View and manage your purchased leads
            </p>
          </div>

          {/* Profile Selector */}
          {profiles.length > 1 && (
            <Card className="p-4 mb-6">
              <label className="block text-sm font-medium mb-2">
                Select Profile
              </label>
              <select
                value={selectedProfile || ""}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full max-w-md px-3 py-2 border rounded-md bg-background"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {getProfileDisplayName(profile)} ({profile.monthly_lead_count} leads remaining)
                  </option>
                ))}
              </select>
            </Card>
          )}

          {/* Lead Credit Balance */}
          {selectedProfile && profiles.length > 0 && (
            <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Monthly Lead Balance</h3>
                  <p className="text-sm text-muted-foreground">
                    {getProfileDisplayName(profiles.find(p => p.id === selectedProfile))}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {profiles.find(p => p.id === selectedProfile)?.monthly_lead_count || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">leads remaining</p>
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                You haven't received any leads yet.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Leads will automatically appear here when new gigs match your profile keywords.
              </p>
              <Button asChild>
                <Link to="/browse-gigs">Browse Available Gigs</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6">
              {leads.map((lead) => {
                const isExclusive = isExclusivePeriod(lead.purchased_at);
                const gig = lead.gigs;
                const consumer = gig?.profiles;
                
                return (
                  <Card key={lead.id} className="p-6">
                    {isExclusive && (
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Exclusive Lead - {Math.ceil(24 - ((new Date().getTime() - new Date(lead.purchased_at).getTime()) / (1000 * 60 * 60)))} hours remaining
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">
                            {gig?.title || "Untitled Gig"}
                          </h3>
                          <Badge variant={lead.status === "active" ? "default" : "secondary"}>
                            {lead.status}
                          </Badge>
                          {isExclusive && (
                            <Badge variant="outline" className="border-primary text-primary">
                              Exclusive
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-4">
                          {gig?.description || "No description"}
                        </p>
                        
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{gig?.location || "Location not specified"}</span>
                          </div>
                          {gig?.budget_min && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>
                                Budget: ${gig.budget_min} - ${gig.budget_max || gig.budget_min}
                              </span>
                            </div>
                          )}
                          {gig?.deadline && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                Deadline: {new Date(gig.deadline).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Received {formatDistanceToNow(new Date(lead.purchased_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Consumer Contact Info (only for exclusive leads) */}
                        {isExclusive && consumer && (
                          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium mb-2 text-sm">Contact Information</h4>
                            <div className="grid gap-2 text-sm">
                              {consumer.full_name && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Name:</span>
                                  <span>{consumer.full_name}</span>
                                </div>
                              )}
                              {consumer.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <a href={`mailto:${consumer.email}`} className="text-primary hover:underline">
                                    {consumer.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-sm text-muted-foreground mb-1">Lead Cost</p>
                        <p className="text-2xl font-bold">${lead.purchase_price}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <Link to={`/gig/${lead.gig_id}`}>View Full Details</Link>
                      </Button>
                      {!isExclusive && (
                        <LeadReturnDialog 
                          leadPurchaseId={lead.id}
                          gigTitle={gig?.title || ""}
                          onSuccess={loadLeads}
                        />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
