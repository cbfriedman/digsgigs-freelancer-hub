import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wrench, Briefcase, Phone, TrendingUp, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoleStats {
  digger?: {
    leadsCount: number;
    profilesCount: number;
    activeLeadsCount: number;
  };
  gigger?: {
    gigsCount: number;
    activeBidsCount: number;
    awardedGigsCount: number;
  };
  telemarketer?: {
    leadsUploadedCount: number;
    pendingCommissions: number;
    paidCommissions: number;
  };
}

const roleConfig = {
  digger: { label: 'Digger', emoji: '🔧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100', icon: Wrench },
  gigger: { label: 'Gigger', emoji: '📋', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100', icon: Briefcase },
  telemarketer: { label: 'Telemarketer', emoji: '📞', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100', icon: Phone },
};

export default function RoleDashboard() {
  const { user, userRoles, activeRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RoleStats>({});

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRoleStats();
  }, [user, userRoles]);

  const fetchRoleStats = async () => {
    if (!user) return;

    try {
      const newStats: RoleStats = {};

      // Fetch Digger stats
      if (userRoles.includes('digger')) {
        const [leadsResponse, profilesResponse, activeLeadsResponse] = await Promise.all([
          supabase
            .from('lead_purchases')
            .select('id', { count: 'exact', head: true })
            .eq('digger_id', user.id),
          supabase
            .from('digger_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('lead_purchases')
            .select('id', { count: 'exact', head: true })
            .eq('digger_id', user.id)
            .eq('status', 'completed')
        ]);

        newStats.digger = {
          leadsCount: leadsResponse.count || 0,
          profilesCount: profilesResponse.count || 0,
          activeLeadsCount: activeLeadsResponse.count || 0,
        };
      }

      // Fetch Gigger stats
      if (userRoles.includes('gigger')) {
        // First get gig IDs
        const { data: userGigs } = await supabase
          .from('gigs')
          .select('id')
          .eq('consumer_id', user.id);

        const gigIds = userGigs?.map(g => g.id) || [];

        const [gigsResponse, bidsResponse, awardedResponse] = await Promise.all([
          supabase
            .from('gigs')
            .select('id', { count: 'exact', head: true })
            .eq('consumer_id', user.id),
          gigIds.length > 0
            ? supabase
                .from('bids')
                .select('id', { count: 'exact', head: true })
                .in('gig_id', gigIds)
                .eq('status', 'pending')
            : { count: 0 },
          supabase
            .from('gigs')
            .select('id', { count: 'exact', head: true })
            .eq('consumer_id', user.id)
            .not('awarded_digger_id', 'is', null)
        ]);

        newStats.gigger = {
          gigsCount: gigsResponse.count || 0,
          activeBidsCount: bidsResponse.count || 0,
          awardedGigsCount: awardedResponse.count || 0,
        };
      }

      // Fetch Telemarketer stats
      if (userRoles.includes('telemarketer')) {
        const { data: teleProfile } = await supabase
          .from('telemarketer_profiles')
          .select('total_leads_uploaded, pending_commissions, paid_commissions')
          .eq('user_id', user.id)
          .single();

        newStats.telemarketer = {
          leadsUploadedCount: teleProfile?.total_leads_uploaded || 0,
          pendingCommissions: teleProfile?.pending_commissions || 0,
          paidCommissions: teleProfile?.paid_commissions || 0,
        };
      }

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching role stats:', error);
      toast({
        title: "Error loading stats",
        description: "Could not load role statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRole = async (role: 'digger' | 'gigger' | 'telemarketer') => {
    await switchRole(role);
    toast({
      title: "Role switched",
      description: `You are now in ${roleConfig[role].label} mode`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">
          Manage all your roles and activities in one place
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Digger Role Card */}
        {userRoles.includes('digger') && stats.digger && (
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Digger
                      {activeRole === 'digger' && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Service Provider</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Profiles</p>
                  <p className="text-2xl font-bold">{stats.digger.profilesCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Leads</p>
                  <p className="text-2xl font-bold">{stats.digger.leadsCount}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Leads</p>
                <p className="text-xl font-semibold text-primary">{stats.digger.activeLeadsCount}</p>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => {
                    handleSwitchRole('digger');
                    navigate('/my-leads');
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Leads
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    handleSwitchRole('digger');
                    navigate('/pricing');
                  }}
                >
                  Buy More Leads
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gigger Role Card */}
        {userRoles.includes('gigger') && stats.gigger && (
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <Briefcase className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Gigger
                      {activeRole === 'gigger' && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Project Poster</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Gigs Posted</p>
                  <p className="text-2xl font-bold">{stats.gigger.gigsCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Active Bids</p>
                  <p className="text-2xl font-bold">{stats.gigger.activeBidsCount}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Awarded Gigs</p>
                <p className="text-xl font-semibold text-primary">{stats.gigger.awardedGigsCount}</p>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => {
                    handleSwitchRole('gigger');
                    navigate('/my-gigs');
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View My Gigs
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    handleSwitchRole('gigger');
                    navigate('/post-gig');
                  }}
                >
                  Post New Gig
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Telemarketer Role Card */}
        {userRoles.includes('telemarketer') && stats.telemarketer && (
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                    <Phone className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Telemarketer
                      {activeRole === 'telemarketer' && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Lead Provider</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Leads Uploaded</p>
                  <p className="text-2xl font-bold">{stats.telemarketer.leadsUploadedCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-500">
                    ${stats.telemarketer.pendingCommissions.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-xl font-semibold text-primary">
                  ${stats.telemarketer.paidCommissions.toFixed(2)}
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => {
                    handleSwitchRole('telemarketer');
                    navigate('/telemarketer-dashboard');
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  View Commissions
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    handleSwitchRole('telemarketer');
                    navigate('/telemarketer-dashboard');
                  }}
                >
                  Upload Leads
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {userRoles.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Active Roles</CardTitle>
            <CardDescription>
              You don't have any active roles yet. Register to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
