import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Briefcase, Phone, TrendingUp, FileText, DollarSign, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";

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
  const { user, userRoles, activeRole, switchRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<RoleStats>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }

    // If no user after loading completes, redirect to register
    if (!user) {
      navigate("/register");
      return;
    }

    // If user has no roles, they need to complete registration
    // But wait a bit for roles to load (they might be loading)
    if (userRoles.length === 0) {
      // Give it a moment for roles to load, then check again
      const checkRolesTimeout = setTimeout(async () => {
        const { data: roles } = await supabase
          .from('user_app_roles')
          .select('app_role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (!roles || roles.length === 0) {
          // Still no roles - redirect to registration
          toast({
            title: "Complete Registration",
            description: "Please select your role(s) to continue.",
          });
          navigate("/register");
        }
      }, 1000);
      
      return () => clearTimeout(checkRolesTimeout);
    }

    // User has roles - fetch stats
    fetchStats();
  }, [user, navigate, userRoles, refreshKey, authLoading]);

  const fetchStats = async () => {
    if (!user || userRoles.length === 0) return;
    
    try {
      // Fetch Digger stats
      if (userRoles.includes('digger')) {
        // Query digger_profiles with error handling
        let profilesCount = 0;
        try {
          const { count, error: profilesError } = await supabase
            .from('digger_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

          // Handle 406 or other errors gracefully
          if (profilesError) {
            if (profilesError.code === 'PGRST116' || profilesError.message?.includes('406') || profilesError.message?.includes('Not Acceptable')) {
              // User might not have digger profile yet or RLS blocking - this is OK
              console.warn('Could not fetch digger profiles count (user may not have profile yet):', profilesError);
            } else {
              console.error('Error fetching digger profiles count:', profilesError);
            }
          } else {
            profilesCount = count || 0;
          }
        } catch (err) {
          console.warn('Error fetching digger profiles count:', err);
        }

        // Query lead_purchases - need digger profile ID first, so skip if no profile
        let leadsCount = 0;
        let activeLeadsCount = 0;
        
        if (profilesCount > 0) {
          try {
            // Get digger profile ID to query leads (use maybeSingle to handle no profile case)
            const { data: diggerProfiles, error: profileError } = await supabase
              .from('digger_profiles')
              .select('id')
              .eq('user_id', user.id)
              .limit(1);

            // Handle 406 or other errors gracefully
            if (profileError) {
              if (profileError.code === 'PGRST116' || profileError.message?.includes('406') || profileError.message?.includes('Not Acceptable')) {
                console.warn('Could not fetch digger profile for lead counts:', profileError);
              } else {
                console.error('Error fetching digger profile for lead counts:', profileError);
              }
            } else if (diggerProfiles && diggerProfiles.length > 0) {
              const diggerProfileId = diggerProfiles[0].id;

              const { count: leadsCountResult, error: leadsError } = await supabase
                .from('lead_purchases')
                .select('id', { count: 'exact', head: true })
                .eq('digger_id', diggerProfileId);

              if (!leadsError) {
                leadsCount = leadsCountResult || 0;
              }

              const { count: activeLeadsCountResult, error: activeLeadsError } = await supabase
                .from('lead_purchases')
                .select('id', { count: 'exact', head: true })
                .eq('digger_id', diggerProfileId)
                .eq('status', 'active');

              if (!activeLeadsError) {
                activeLeadsCount = activeLeadsCountResult || 0;
              }
            }
          } catch (err) {
            console.warn('Error fetching lead counts:', err);
          }
        }

        setStats(prev => ({
          ...prev,
          digger: {
            profilesCount,
            leadsCount,
            activeLeadsCount,
          }
        }));
      }

      // Fetch Gigger stats
      if (userRoles.includes('gigger')) {
        const { count } = await supabase
          .from('gigs')
          .select('id', { count: 'exact', head: true })
          .eq('consumer_id', user.id);

        setStats(prev => ({
          ...prev,
          gigger: {
            gigsCount: count || 0,
            activeBidsCount: 0,
            awardedGigsCount: 0,
          }
        }));
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSwitchRole = async (role: 'digger' | 'gigger' | 'telemarketer') => {
    await switchRole(role);
    toast({
      title: "Role switched",
      description: `You are now in ${roleConfig[role].label} mode`,
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">
          Manage all your roles and activities in one place
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Digger Role Card */}
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
                    {!userRoles.includes('digger') && (
                      <Badge variant="outline" className="text-xs">Not Registered</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Service Provider</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userRoles.includes('digger') ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Profiles</p>
                    <p className="text-2xl font-bold">{stats.digger?.profilesCount ?? 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Leads</p>
                    <p className="text-2xl font-bold">{stats.digger?.leadsCount ?? 0}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Active Leads</p>
                  <p className="text-xl font-semibold text-primary">{stats.digger?.activeLeadsCount ?? 0}</p>
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
                      navigate('/my-profiles');
                    }}
                  >
                    My Profiles
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      handleSwitchRole('digger');
                      navigate('/pricing');
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create a new profile
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Register as a Digger to find work opportunities</p>
                <Button onClick={() => navigate('/digger-registration')}>
                  Register as Digger
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gigger Role Card */}
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
                    {!userRoles.includes('gigger') && (
                      <Badge variant="outline" className="text-xs">Not Registered</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Project Poster</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userRoles.includes('gigger') ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Gigs Posted</p>
                    <p className="text-2xl font-bold">{stats.gigger?.gigsCount ?? 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Active Bids</p>
                    <p className="text-2xl font-bold">{stats.gigger?.activeBidsCount ?? 0}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Awarded Gigs</p>
                  <p className="text-xl font-semibold text-primary">{stats.gigger?.awardedGigsCount ?? 0}</p>
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
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Register as a Gigger to post projects</p>
                <Button onClick={async () => {
                  if (!user) return;
                  
                  // Check if user already has gigger role
                  const { data: existingRoles } = await supabase
                    .from('user_app_roles')
                    .select('app_role')
                    .eq('user_id', user.id)
                    .eq('app_role', 'gigger');
                  
                  if (existingRoles && existingRoles.length > 0) {
                    // User already has gigger role, just switch to it
                    await switchRole('gigger');
                    navigate('/post-gig');
                  } else {
                    // User doesn't have gigger role, add it
                    const { error: roleError } = await supabase
                      .from('user_app_roles')
                      .insert({ user_id: user.id, app_role: 'gigger', is_active: true });
                    
                    if (roleError) {
                      toast({
                        title: "Error",
                        description: "Failed to add Gigger role. Please try again.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Switch to gigger role and navigate
                    await switchRole('gigger');
                    toast({
                      title: "Success",
                      description: "Gigger role added! You can now post gigs.",
                    });
                    navigate('/post-gig');
                  }
                }}>
                  Register as Gigger
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Telemarketer Role Card */}
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
                    {!userRoles.includes('telemarketer') && (
                      <Badge variant="outline" className="text-xs">Not Registered</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Lead Provider</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userRoles.includes('telemarketer') ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Leads Uploaded</p>
                    <p className="text-2xl font-bold">{stats.telemarketer?.leadsUploadedCount ?? 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-amber-500">
                      ${(stats.telemarketer?.pendingCommissions ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-xl font-semibold text-primary">
                    ${(stats.telemarketer?.paidCommissions ?? 0).toFixed(2)}
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
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Register as a Telemarketer to earn commissions</p>
                <Button onClick={() => navigate('/register?role=telemarketer')}>
                  Register as Telemarketer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}