import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Briefcase, TrendingUp, FileText, DollarSign, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { Footer } from "@/components/Footer";

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
}

const roleConfig = {
  digger: { label: 'Digger', emoji: '🔧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100', icon: Wrench },
  gigger: { label: 'Gigger', emoji: '📋', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100', icon: Briefcase },
};

export default function RoleDashboard() {
  const { user, userRoles, activeRole, switchRole, loading: authLoading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [stats, setStats] = useState<RoleStats>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCheckingRoles, setIsCheckingRoles] = useState(false);
  const hasCheckedRolesRef = useRef(false);
  const hasFetchedStatsRef = useRef(false);
  
  // Check if user just completed registration - refresh roles immediately
  // NOTE: This useEffect is moved after fetchStats definition to avoid initialization error

  // Memoize fetchStats to prevent recreation on every render
  // Use user?.id instead of user object to prevent unnecessary recreations
  const fetchStats = useCallback(async (forceRefresh = false) => {
    if (!user || userRoles.length === 0) return;
    
    // Allow force refresh to bypass the flag
    if (hasFetchedStatsRef.current && !forceRefresh) return;
    
    hasFetchedStatsRef.current = true;
    
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
      hasFetchedStatsRef.current = false; // Allow retry on error
    }
  }, [user?.id, userRoles]); // Need userRoles array to check includes()

  // Check if user just completed registration - refresh roles immediately
  // Moved here after fetchStats is defined to avoid initialization error
  useEffect(() => {
    const justRegistered = searchParams.get('registered') === 'true';
    if (justRegistered && user?.id) {
      console.log('User just registered, refreshing roles and stats...');
      
      // Immediately refresh roles to ensure they're loaded
      refreshRoles().then(async () => {
        console.log('Roles refreshed after registration');
        // Reset the stats fetch flag to allow stats to be fetched again
        hasFetchedStatsRef.current = false;
        // Wait a moment for roles to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        // Force fetch stats again with updated roles
        await fetchStats(true);
        // Remove the query parameter from URL after roles are refreshed
        searchParams.delete('registered');
        setSearchParams(searchParams, { replace: true });
      }).catch(err => {
        console.warn('Error refreshing roles after registration:', err);
        // Still remove the parameter even if refresh fails
        searchParams.delete('registered');
        setSearchParams(searchParams, { replace: true });
      });
    }
  }, [user?.id, refreshRoles, searchParams, setSearchParams, fetchStats]);

  // Check roles only once when component mounts or user changes
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

    // Only check roles once
    if (hasCheckedRolesRef.current) {
      return;
    }

    // If user has no roles, wait for AuthContext to load them, then check
    // But don't redirect immediately - give it time and be defensive about errors
    if (userRoles.length === 0 && !isCheckingRoles) {
      setIsCheckingRoles(true);
      hasCheckedRolesRef.current = true;
      
      // Wait a bit for AuthContext to finish loading roles, then check
      const checkRolesTimeout = setTimeout(async () => {
        try {
          // First, try refreshing roles from AuthContext (uses RPC function that bypasses RLS)
          await refreshRoles();
          
          // Wait for state to potentially update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check database directly using RPC function
          try {
            // Use the safe RPC function that bypasses RLS completely
            const { data: rpcRoles, error: rpcError } = await (supabase
              .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
            
            if (rpcError) {
              console.error('RPC function error (non-fatal):', rpcError);
              // Don't redirect on error - user might have roles but query is failing
              // This could be due to migrations not being applied
              console.warn('RPC function failed - this might mean migrations need to be applied');
              setIsCheckingRoles(false);
              // Show a helpful message but don't redirect
              toast({
                title: "Loading Roles",
                description: "Having trouble loading your roles. The page will still work.",
                variant: "default",
              });
              return;
            }
            
            if (!rpcRoles || (rpcRoles as any[]).length === 0) {
              // No roles found - but DON'T redirect automatically
              // Let user see the dashboard and choose to register if they want
              // This is better UX than forcing a redirect
              console.log('No roles found - showing dashboard with registration options');
              setIsCheckingRoles(false);
              
              // Show a helpful toast but don't redirect
              toast({
                title: "No Roles Found",
                description: "You can register for roles using the buttons below.",
                variant: "default",
              });
            } else {
              // Found roles via RPC - refresh AuthContext to update state
              console.log('Found roles via RPC, refreshing AuthContext:', rpcRoles);
              await refreshRoles();
              setIsCheckingRoles(false);
            }
          } catch (err) {
            console.error('Exception checking roles:', err);
            // Don't redirect on exception - might be temporary error
            setIsCheckingRoles(false);
            toast({
              title: "Error Loading Roles",
              description: "Please refresh the page. If the issue persists, contact support.",
              variant: "destructive",
            });
          }
        } catch (err) {
          console.error('Error in role check:', err);
          setIsCheckingRoles(false);
          // Don't redirect on error
        }
      }, 3000); // Wait 3 seconds for AuthContext to load roles
      
      return () => {
        clearTimeout(checkRolesTimeout);
      };
    } else if (userRoles.length > 0) {
      // User has roles, mark as checked
      hasCheckedRolesRef.current = true;
      setIsCheckingRoles(false);
    }
  }, [user, authLoading, navigate, toast]); // Removed problematic dependencies

  // Fetch stats when userRoles are available (separate effect to prevent loops)
  // Use a ref to track if we've already fetched to prevent multiple calls
  useEffect(() => {
    // Reset fetch flag when user or roles change significantly
    if (user?.id && userRoles.length > 0) {
      // Only fetch if we haven't already
      if (!hasFetchedStatsRef.current && !authLoading) {
        fetchStats();
      }
    } else {
      // Reset flag when user/roles are cleared
      hasFetchedStatsRef.current = false;
    }
  }, [authLoading, user?.id, userRoles.length, fetchStats]);

  const handleSwitchRole = async (role: 'digger' | 'gigger') => {
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

  // Show loading state only while auth is loading, not while checking roles
  // Allow user to see dashboard even if role check is in progress
  if (authLoading && !user) {
    return (
      <div className="min-h-screen relative">
        <Navigation />
        <div className="container mx-auto px-4 py-4 sm:py-8 relative z-0">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show a message if checking roles but don't block the page
  const showRoleCheckMessage = isCheckingRoles && userRoles.length === 0;

  return (
    <div className="min-h-screen relative">
      <Navigation />
      <div className="container mx-auto px-4 py-4 sm:py-8 relative z-0">
      <EmailVerificationBanner />
      
      {/* Show helpful message if user has no roles (but don't block access) */}
      {user && userRoles.length === 0 && !isCheckingRoles && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                No roles assigned yet
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                To get started, please select your role(s) by clicking the registration buttons below or visit the registration page.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/register?complete=true')}
            >
              Complete Registration
            </Button>
          </div>
        </div>
      )}
      
      {/* Show loading message while checking roles */}
      {showRoleCheckMessage && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Loading your roles... Please wait.
          </p>
        </div>
      )}
      
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">My Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage all your roles and activities in one place
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                  <p className="text-xs sm:text-sm text-muted-foreground">Active Leads</p>
                  <p className="text-lg sm:text-xl font-semibold text-primary">{stats.digger?.activeLeadsCount ?? 0}</p>
                </div>
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <Button 
                    variant="default" 
                    className="w-full text-sm sm:text-base"
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
                    className="w-full text-sm sm:text-base"
                    onClick={() => {
                      handleSwitchRole('digger');
                      navigate('/my-profiles');
                    }}
                  >
                    My Profiles
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-sm sm:text-base"
                    onClick={() => {
                      handleSwitchRole('digger');
                      navigate('/profile-categories');
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
                <Button onClick={() => navigate('/register?complete=true&type=digger')}>
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
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Gigs Posted</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.gigger?.gigsCount ?? 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Active Bids</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.gigger?.activeBidsCount ?? 0}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Awarded Gigs</p>
                  <p className="text-lg sm:text-xl font-semibold text-primary">{stats.gigger?.awardedGigsCount ?? 0}</p>
                </div>
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <Button 
                    variant="default" 
                    className="w-full text-sm sm:text-base"
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
                    className="w-full text-sm sm:text-base"
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
                  
                  try {
                    // First check if user already has gigger role from AuthContext (avoid query if possible)
                    if (userRoles.includes('gigger')) {
                      await switchRole('gigger');
                      navigate('/post-gig');
                      return;
                    }
                    
                    // Check if user already has gigger role using RPC function (bypasses RLS)
                    let hasGiggerRole = false;
                    let checkError = null;
                    
                    try {
                      // Use RPC function to check role (bypasses RLS)
                      const { data: hasRole, error: hasRoleError } = await supabase
                        .rpc('has_app_role', { 
                          _user_id: user.id, 
                          _role: 'gigger' 
                        });
                      
                      if (!hasRoleError && hasRole === true) {
                        hasGiggerRole = true;
                      } else if (hasRoleError) {
                        checkError = hasRoleError;
                        // Fallback: check AuthContext
                        if (userRoles.includes('gigger')) {
                          hasGiggerRole = true;
                        }
                      }
                    } catch (rpcException) {
                      console.warn('RPC function failed, checking AuthContext:', rpcException);
                      // Fallback: check AuthContext
                      if (userRoles.includes('gigger')) {
                        hasGiggerRole = true;
                      }
                    }
                    
                    if (hasGiggerRole) {
                      // User already has gigger role, just switch to it
                      await switchRole('gigger');
                      navigate('/post-gig');
                    } else {
                      // User doesn't have gigger role, add it using RPC function
                      let roleError = null;
                      
                      try {
                        // Try direct INSERT first
                        const { error: directInsertError } = await supabase
                          .from('user_app_roles')
                          .insert({ user_id: user.id, app_role: 'gigger', is_active: true });
                        
                        // If recursion error, use RPC function
                        if (directInsertError && (directInsertError.code === '42P17' || directInsertError.message?.includes('infinite recursion'))) {
                          console.log('Infinite recursion detected, using RPC function');
                          const { error: rpcInsertError } = await (supabase
                            .rpc as any)('insert_user_app_role', {
                              p_user_id: user.id,
                              p_app_role: 'gigger'
                            });
                          
                          if (rpcInsertError) {
                            roleError = rpcInsertError;
                          }
                        } else if (directInsertError) {
                          roleError = directInsertError;
                        }
                      } catch (insertException) {
                        console.error('Exception adding gigger role:', insertException);
                        roleError = insertException as any;
                      }
                      
                      if (roleError) {
                        console.error('Error adding gigger role:', roleError);
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
                  } catch (err) {
                    console.error('Exception in gigger role check:', err);
                    toast({
                      title: "Error",
                      description: "An error occurred. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}>
                  Register as Gigger
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
      <Footer />
    </div>
  );
}