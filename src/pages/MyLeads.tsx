import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Calendar, DollarSign, Mail, Phone, AlertCircle, Lock, Zap, UserPlus, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { goToCreateProfile } from "@/lib/profileWorkspaceRoute";
import SEOHead from "@/components/SEOHead";
import { LeadReturnDialog } from "@/components/LeadReturnDialog";
// LeadExclusivityExtension removed - exclusivity feature deprecated
import { LeadCountdownTimer } from "@/components/LeadCountdownTimer";
import { formatDistanceToNow } from "date-fns";
import {
  GIGGER_CONTACT_METHODS,
  parseContactPreferences,
  getContactLink,
} from "@/config/giggerContactMethods";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

export default function MyLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  // After bulk checkout success: create lead_purchases from Stripe session then clear URL params
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const bulkSuccess = params.get("bulk_purchase") === "success";
    const sessionId = params.get("session_id");
    if (!bulkSuccess || !sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        await invokeEdgeFunction<{ success?: boolean }>(supabase, "process-bulk-purchase", {
          body: { sessionId },
        });
        if (cancelled) return;
        toast.success("Leads unlocked. Contact info is now available.");
        navigate("/my-leads", { replace: true });
        if (selectedProfile) loadLeads();
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Failed to complete lead purchase");
      }
    })();
    return () => { cancelled = true; };
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
      setLoading(true);
      const { data, error } = await supabase
        .from("digger_profiles")
        .select("id, business_name, profile_name, monthly_lead_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setProfiles(data);
        setSelectedProfile(data[0].id);
      } else {
        setProfiles([]);
        setSelectedProfile(null);
      }
    } catch (error: any) {
      console.error("Error loading profiles:", error);
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
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
            lead_source,
            awarded_at,
            consumer_email,
            consumer_phone,
            contact_preferences,
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
        title="My Leads (Digger) | Digs & Gigs"
        description="As a Digger (freelancer), view and manage your purchased leads. Unlock Gigger contact details and track lead usage."
      />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Leads</h1>
            <p className="text-muted-foreground">
              Leads you’ve unlocked from Giggers’ gigs. Contact clients and track usage.
            </p>
          </div>

          {/* No digger profile yet — CTA to create one */}
          {profiles.length === 0 && !loading && (
            <Card className="p-10 text-center max-w-lg mx-auto">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <UserPlus className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Create your first Digger profile</h2>
              <p className="text-muted-foreground mb-6">
                You need a Digger profile to receive and manage leads. Create one to start bidding on gigs and buying leads.
              </p>
              <Button
                size="lg"
                onClick={() => goToCreateProfile(navigate)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Create Digger profile
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Already have a profile? Complete registration in your dashboard.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => navigate("/role-dashboard")}
              >
                Go to Dashboard
              </Button>
            </Card>
          )}

          {/* Content when user has at least one profile */}
          {profiles.length > 0 && (
            <>
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
          {selectedProfile && (
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
                This page shows <strong>purchased or awarded leads</strong>, not bids. When you buy a lead or get awarded one, it will appear here.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                To see your bids (e.g. proposals you’ve submitted), go to My Bids. To find gigs and buy leads, browse available gigs.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild variant="default" className="gap-2">
                  <Link to="/my-bids">
                    <FileText className="h-4 w-4" />
                    View My Bids
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/browse-gigs">Browse Available Gigs</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6">
              {leads.map((lead) => {
                const gig = lead.gigs;
                const consumer = gig?.profiles;
                const queueEntry = lead.lead_exclusivity_queue?.[0];
                const isExclusive = lead.is_exclusive && queueEntry?.status === "active";
                const isAwarded = gig?.awarded_at;
                const extensions = queueEntry?.lead_exclusivity_extensions || [];
                const latestExtension = extensions[extensions.length - 1];
                
                // Determine if we're in post-award 48hr lock
                const isPostAwardLocked = isAwarded && !lead.awarded_at && (() => {
                  const awardTime = new Date(gig.awarded_at).getTime();
                  const now = new Date().getTime();
                  const hoursSince = (now - awardTime) / (1000 * 60 * 60);
                  return hoursSince < 48;
                })();

                const postAwardExpiresAt = isPostAwardLocked
                  ? new Date(new Date(gig.awarded_at).getTime() + 48 * 60 * 60 * 1000).toISOString()
                  : null;
                
                return (
                  <Card key={lead.id} className="p-6">
                    {/* Post-Award 48hr Lock Banner */}
                    {isPostAwardLocked && (
                      <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-700">
                              Lead Awarded - 48hr Lock Period
                            </span>
                          </div>
                          {postAwardExpiresAt && (
                            <LeadCountdownTimer 
                              expiresAt={postAwardExpiresAt}
                              label="Lock ends in"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Exclusivity Banner */}
                    {isExclusive && !isPostAwardLocked && (
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">
                              Exclusive Lead
                              {extensions.length > 0 && ` (Extended ${extensions.length}x)`}
                            </span>
                          </div>
                          {queueEntry?.exclusivity_ends_at && (
                            <div className="flex items-center gap-3">
                              <LeadCountdownTimer 
                                expiresAt={queueEntry.exclusivity_ends_at}
                                label="Expires in"
                                onExpire={() => loadLeads()}
                              />
                              {/* Exclusivity extension removed */}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                          {!isExclusive && lead.is_exclusive && (
                            <Badge variant="outline">
                              Was Exclusive
                            </Badge>
                          )}
                          {gig?.lead_source && (
                            <Badge variant="secondary">
                              {gig.lead_source === "telemarketing" ? "📞 Telemarketing" : "🌐 Internet"}
                            </Badge>
                          )}
                          {isPostAwardLocked && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
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

                        {/* Consumer Contact Info (completed purchase, exclusive, or awarded) */}
                        {(isExclusive || lead.awarded_at || lead.status === "completed") && (consumer || gig?.consumer_email || gig?.consumer_phone || (gig?.contact_preferences && parseContactPreferences(gig.contact_preferences).length > 0)) && (
                          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium mb-2 text-sm">
                              {isExclusive ? "Contact Information (Exclusive Access)" : "Contact Information"}
                            </h4>
                            <div className="grid gap-2 text-sm">
                              {consumer?.full_name && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Name:</span>
                                  <span>{consumer.full_name}</span>
                                </div>
                              )}
                              {(consumer?.email || gig?.consumer_email) && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <a href={`mailto:${consumer?.email || gig?.consumer_email}`} className="text-primary hover:underline">
                                    {consumer?.email || gig?.consumer_email}
                                  </a>
                                </div>
                              )}
                              {gig?.consumer_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <a href={`tel:${gig.consumer_phone}`} className="text-primary hover:underline">
                                    {gig.consumer_phone}
                                  </a>
                                </div>
                              )}
                              {gig?.contact_preferences && parseContactPreferences(gig.contact_preferences).map((item: { type: string; value: string }, i: number) => {
                                const method = GIGGER_CONTACT_METHODS.find((m) => m.id === item.type);
                                const link = getContactLink(item);
                                return (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="font-medium text-muted-foreground shrink-0">{method?.label ?? item.type}:</span>
                                    {link ? (
                                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                        {item.value}
                                      </a>
                                    ) : (
                                      <span>{item.value}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Extension History */}
                        {extensions.length > 0 && (
                          <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                            <h4 className="font-medium mb-2 text-sm">Extension History</h4>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {extensions.map((ext: any, idx: number) => (
                                <div key={idx} className="flex justify-between">
                                  <span>Extension #{ext.extension_number}</span>
                                  <span>${ext.extension_cost.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-sm text-muted-foreground mb-1">Lead Cost</p>
                        <p className="text-2xl font-bold">${lead.purchase_price.toFixed(2)}</p>
                        {extensions.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            +${extensions.reduce((sum: number, ext: any) => sum + ext.extension_cost, 0).toFixed(2)} extensions
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button asChild className="flex-1" disabled={isPostAwardLocked}>
                        <Link to={`/gig/${lead.gig_id}`}>
                          {isPostAwardLocked ? "Locked - View After 48hrs" : "View Full Details"}
                        </Link>
                      </Button>
                      {!isExclusive && !isPostAwardLocked && (
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
            </>
          )}
        </main>
      </div>
    </>
  );
}
