import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  Briefcase, 
  TrendingUp, 
  FileText, 
  Plus,
  ArrowRight,
  Sparkles,
  Users,
  User,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/PageLayout";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function RoleDashboard() {
  const { user, userRoles, activeRole, switchRole, loading: authLoading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [stats, setStats] = useState<RoleStats>({});
  const [isCheckingRoles, setIsCheckingRoles] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const hasCheckedRolesRef = useRef(false);
  const hasFetchedStatsRef = useRef(false);
  
  // Memoize fetchStats to prevent recreation on every render
  const fetchStats = useCallback(async (forceRefresh = false) => {
    if (!user || userRoles.length === 0) return;
    
    if (hasFetchedStatsRef.current && !forceRefresh) return;
    
    hasFetchedStatsRef.current = true;
    
    try {
      // Fetch Digger stats
      if (userRoles.includes('digger')) {
        let profilesCount = 0;
        try {
          const { count, error: profilesError } = await supabase
            .from('digger_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

          if (profilesError) {
            if (profilesError.code === 'PGRST116' || profilesError.message?.includes('406') || profilesError.message?.includes('Not Acceptable')) {
              console.warn('Could not fetch digger profiles count:', profilesError);
            } else {
              console.error('Error fetching digger profiles count:', profilesError);
            }
          } else {
            profilesCount = count || 0;
          }
        } catch (err) {
          console.warn('Error fetching digger profiles count:', err);
        }

        let leadsCount = 0;
        let activeLeadsCount = 0;
        
        if (profilesCount > 0) {
          try {
            const { data: diggerProfiles, error: profileError } = await supabase
              .from('digger_profiles')
              .select('id')
              .eq('user_id', user.id)
              .limit(1);

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
      hasFetchedStatsRef.current = false;
    }
  }, [user?.id, userRoles]);

  // Check if user just completed registration
  useEffect(() => {
    const justRegistered = searchParams.get('registered') === 'true';
    if (justRegistered && user?.id) {
      setShowWelcomeModal(true);
      console.log('User just registered, refreshing roles and stats...');
      
      refreshRoles().then(async () => {
        console.log('Roles refreshed after registration');
        hasFetchedStatsRef.current = false;
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchStats(true);
        searchParams.delete('registered');
        setSearchParams(searchParams, { replace: true });
      }).catch(err => {
        console.warn('Error refreshing roles after registration:', err);
        searchParams.delete('registered');
        setSearchParams(searchParams, { replace: true });
      });
    }
  }, [user?.id, refreshRoles, searchParams, setSearchParams, fetchStats]);

  // Check roles only once when component mounts or user changes
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/register");
      return;
    }

    if (hasCheckedRolesRef.current) return;

    if (userRoles.length === 0 && !isCheckingRoles) {
      setIsCheckingRoles(true);
      hasCheckedRolesRef.current = true;
      
      const checkRolesTimeout = setTimeout(async () => {
        try {
          await refreshRoles();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const { data: rpcRoles, error: rpcError } = await (supabase
              .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
            
            if (rpcError) {
              console.error('RPC function error (non-fatal):', rpcError);
              setIsCheckingRoles(false);
              toast({
                title: "Loading Roles",
                description: "Having trouble loading your roles. The page will still work.",
                variant: "default",
              });
              return;
            }
            
            if (!rpcRoles || (rpcRoles as any[]).length === 0) {
              console.log('No roles found - showing dashboard with registration options');
              setIsCheckingRoles(false);
              toast({
                title: "No Roles Found",
                description: "You can register for roles using the buttons below.",
                variant: "default",
              });
            } else {
              console.log('Found roles via RPC, refreshing AuthContext:', rpcRoles);
              await refreshRoles();
              setIsCheckingRoles(false);
            }
          } catch (err) {
            console.error('Exception checking roles:', err);
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
        }
      }, 3000);
      
      return () => {
        clearTimeout(checkRolesTimeout);
      };
    } else if (userRoles.length > 0) {
      hasCheckedRolesRef.current = true;
      setIsCheckingRoles(false);
    }
  }, [user, authLoading, navigate, toast]);

  // Fetch stats when userRoles are available
  useEffect(() => {
    if (user?.id && userRoles.length > 0) {
      if (!hasFetchedStatsRef.current && !authLoading) {
        fetchStats();
      }
    } else {
      hasFetchedStatsRef.current = false;
    }
  }, [authLoading, user?.id, userRoles.length, fetchStats]);

  const handleSwitchRole = async (role: 'digger' | 'gigger') => {
    await switchRole(role);
    toast({
      title: "Role switched",
      description: `You are now in ${role === 'digger' ? 'Digger' : 'Gigger'} mode`,
    });
  };

  const handleRegisterGigger = async () => {
    if (!user) return;
    
    try {
      if (userRoles.includes('gigger')) {
        await switchRole('gigger');
        navigate('/post-gig');
        return;
      }
      
      let hasGiggerRole = false;
      
      try {
        const { data: hasRole, error: hasRoleError } = await supabase
          .rpc('has_app_role', { 
            _user_id: user.id, 
            _role: 'gigger' 
          });
        
        if (!hasRoleError && hasRole === true) {
          hasGiggerRole = true;
        } else if (hasRoleError && userRoles.includes('gigger')) {
          hasGiggerRole = true;
        }
      } catch (rpcException) {
        console.warn('RPC function failed, checking AuthContext:', rpcException);
        if (userRoles.includes('gigger')) {
          hasGiggerRole = true;
        }
      }
      
      if (hasGiggerRole) {
        await switchRole('gigger');
        navigate('/post-gig');
      } else {
        let roleError = null;
        
        try {
          const { error: directInsertError } = await supabase
            .from('user_app_roles')
            .insert({ user_id: user.id, app_role: 'gigger', is_active: true });
          
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
  };

  // Loading state
  if (authLoading && !user) {
    return (
      <PageLayout showFooter={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center animate-fade-in">
            <div className="relative mx-auto mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Loading your dashboard</h3>
            <p className="text-muted-foreground">Please wait a moment...</p>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  const showRoleCheckMessage = isCheckingRoles && userRoles.length === 0;
  const hasRoles = userRoles.length > 0;

  return (
    <PageLayout maxWidth="wide">
      <div className="space-y-8">
        <EmailVerificationBanner />
        
        {/* Welcome Header */}
        <header className="animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-accent">Welcome back</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
                My Dashboard
              </h1>
              <p className="text-muted-foreground max-w-lg">
                Manage all your roles and activities in one place. Switch between being a service provider or project poster.
              </p>
            </div>
            
            {hasRoles && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-3 py-1.5 text-sm">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  {userRoles.length} {userRoles.length === 1 ? 'Role' : 'Roles'} Active
                </Badge>
              </div>
            )}
          </div>
        </header>

        {/* No Roles Message */}
        {user && userRoles.length === 0 && !isCheckingRoles && (
          <Card className="border-info/30 bg-info/5 animate-fade-in-up stagger-1">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-info/10">
                <AlertCircle className="h-6 w-6 text-info" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Get started with your first role</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a role below to unlock the full platform experience. You can have both roles at the same time!
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigate('/register?complete=true')}
                className="shrink-0"
              >
                Complete Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Loading Roles Message */}
        {showRoleCheckMessage && (
          <Card className="border-warning/30 bg-warning/5 animate-fade-in">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-warning border-t-transparent"></div>
              <p className="text-sm text-warning-foreground">
                Loading your roles... Please wait.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Role Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Digger Role Card */}
          <Card className="relative overflow-hidden hover-lift animate-fade-in-up stagger-2 group">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Wrench className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-xl font-display">Digger</CardTitle>
                    {activeRole === 'digger' && (
                      <Badge className="bg-primary/10 text-primary border-0 font-medium">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {!userRoles.includes('digger') && (
                      <Badge variant="secondary" className="font-medium">
                        Not Registered
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">Service Provider — Find work opportunities</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-5">
              {userRoles.includes('digger') ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.digger?.profilesCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Profiles</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.digger?.leadsCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Leads</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/10 text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.digger?.activeLeadsCount ?? 0}</p>
                      <p className="text-xs text-primary/70 mt-1">Active</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-2">
                    <Button 
                      size="lg"
                      className="w-full justify-between group/btn"
                      onClick={() => {
                        handleSwitchRole('digger');
                        navigate('/my-leads');
                      }}
                    >
                      <span className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View My Leads
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
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
                          navigate('/create-digger-profile');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Profile
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Wrench className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Become a Digger</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Register as a service provider to find work opportunities and connect with clients looking for your skills.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gigger Role Card */}
          <Card className="relative overflow-hidden hover-lift animate-fade-in-up stagger-3 group">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-bl-full pointer-events-none" />
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
                  <Briefcase className="h-7 w-7 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-xl font-display">Gigger</CardTitle>
                    {activeRole === 'gigger' && (
                      <Badge className="bg-accent/10 text-accent border-0 font-medium">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {!userRoles.includes('gigger') && (
                      <Badge variant="secondary" className="font-medium">
                        Not Registered
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">Project Poster — Find talent for your projects</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-5">
              {userRoles.includes('gigger') ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.gigger?.gigsCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Gigs Posted</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.gigger?.activeBidsCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Active Bids</p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/10 text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-accent">{stats.gigger?.awardedGigsCount ?? 0}</p>
                      <p className="text-xs text-accent/70 mt-1">Awarded</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-2">
                    <Button 
                      size="lg"
                      variant="hero"
                      className="w-full justify-between group/btn"
                      onClick={() => {
                        handleSwitchRole('gigger');
                        navigate('/my-gigs');
                      }}
                    >
                      <span className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        View My Gigs
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          handleSwitchRole('gigger');
                          navigate('/my-profiles');
                        }}
                      >
                        <User className="h-4 w-4 mr-1" />
                        My Profile
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          handleSwitchRole('gigger');
                          navigate('/post-gig');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Post New Gig
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Become a Gigger</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Register as a project poster to find talented service providers and get your projects done.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Tips Section (only if user has roles) */}
        {hasRoles && (
          <Card className="border-dashed animate-fade-in-up stagger-4">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Pro Tip</h3>
                  <p className="text-sm text-muted-foreground">
                    You can have both Digger and Gigger roles active at the same time. Switch between them seamlessly to find work or post projects!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Welcome modal after registration */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            {userRoles.includes('gigger') && !userRoles.includes('digger') ? (
              <>
                <DialogTitle className="text-center text-xl">Welcome, Project Poster!</DialogTitle>
                <DialogDescription className="text-center text-base">
                  You&apos;re ready to find talented professionals for your projects. Post your first gig to get matched with qualified service providers who can help. Add a photo and intro to your profile to build trust when you connect.
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle className="text-center text-xl">Welcome to Digs & Gigs!</DialogTitle>
                <DialogDescription className="text-center text-base">
                  Please complete your profile to get the most out of the platform. Add your photo, services, and details to attract clients and stand out.
                </DialogDescription>
              </>
            )}
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {userRoles.includes('digger') ? (
              <Button onClick={() => { setShowWelcomeModal(false); navigate('/edit-digger-profile'); }} className="w-full sm:w-auto">
                Complete My Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : userRoles.includes('gigger') ? (
              <Button onClick={() => { setShowWelcomeModal(false); navigate('/post-gig'); }} className="w-full sm:w-auto">
                Post My First Gig
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setShowWelcomeModal(false)} className="w-full sm:w-auto">
              I&apos;ll do it later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
