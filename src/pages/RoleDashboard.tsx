import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Briefcase, Plus, ArrowRight, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/PageLayout";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { goToProfileWorkspace } from "@/lib/profileWorkspaceRoute";
import { computeDiggerProfileDetailCompletion } from "@/lib/profileCompletion";
import { getCanonicalDiggerProfilePath, getCanonicalGiggerProfilePath } from "@/lib/profileUrls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FirstProfileDialog } from "@/components/FirstProfileDialog";

interface RoleStats {
  digger?: {
    leadsCount: number;
    profilesCount: number;
    activeLeadsCount: number;
    primaryProfileId?: string | null;
    primaryProfileHandle?: string | null;
  };
  gigger?: {
    gigsCount: number;
    activeBidsCount: number;
    awardedGigsCount: number;
    hasGiggerProfile: boolean;
  };
}

export default function RoleDashboard() {
  const { user, userRoles, activeRole, switchRole, loading: authLoading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [stats, setStats] = useState<RoleStats>({});
  const [diggerProfileForCompletion, setDiggerProfileForCompletion] = useState<Record<string, unknown> | null>(null);
  const [diggerPortfolioCount, setDiggerPortfolioCount] = useState(0);
  const [diggerExperienceCount, setDiggerExperienceCount] = useState(0);
  const [isCheckingRoles, setIsCheckingRoles] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [firstProfileDialogRole, setFirstProfileDialogRole] = useState<"digger" | "gigger" | null>(null);
  const hasCheckedRolesRef = useRef(false);
  const hasFetchedStatsRef = useRef(false);
  
  // Memoize fetchStats to prevent recreation on every render
  const fetchStats = useCallback(async (forceRefresh = false) => {
    if (!user || userRoles.length === 0) return;
    
    if (hasFetchedStatsRef.current && !forceRefresh) return;
    
    hasFetchedStatsRef.current = true;
    
    try {
      // Fetch Digger stats (single-profile model)
      if (userRoles.includes('digger')) {
        let profilesCount = 0;
        let primaryDiggerProfileId: string | null = null;
        let primaryDiggerProfileHandle: string | null = null;
        try {
          const { data: diggerProfiles, error: profilesError } = await (supabase
            .from('digger_profiles') as any)
            .select('id, handle, business_name, profession, bio, profile_image_url, work_photos, hourly_rate, hourly_rate_min, hourly_rate_max, pricing_model, certifications, country, service_countries, portfolio_url, portfolio_urls, website_url, social_links, digger_skills (skills (name)), digger_categories (categories (name)), profiles!digger_profiles_user_id_fkey (avatar_url)')
            .eq('user_id', user.id)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(1);

          if (profilesError) {
            setDiggerProfileForCompletion(null);
            setDiggerPortfolioCount(0);
            setDiggerExperienceCount(0);
            if (profilesError.code === 'PGRST116' || profilesError.message?.includes('406') || profilesError.message?.includes('Not Acceptable')) {
              console.warn('Could not fetch digger profiles count:', profilesError);
            } else {
              console.error('Error fetching digger profiles count:', profilesError);
            }
          } else {
            const primary = diggerProfiles?.[0];
            primaryDiggerProfileId = primary?.id ?? null;
            primaryDiggerProfileHandle = primary?.handle ?? null;
            profilesCount = primaryDiggerProfileId ? 1 : 0;
            setDiggerProfileForCompletion(primary ? (primary as unknown as Record<string, unknown>) : null);
            if (primaryDiggerProfileId) {
              try {
                const [portfolioRes, experienceRes] = await Promise.all([
                  (supabase.from('digger_portfolio_items' as any)).select('id', { count: 'exact', head: true }).eq('digger_profile_id', primaryDiggerProfileId),
                  (supabase.from('digger_experience' as any)).select('id', { count: 'exact', head: true }).eq('digger_profile_id', primaryDiggerProfileId),
                ]);
                setDiggerPortfolioCount(portfolioRes.count ?? 0);
                setDiggerExperienceCount(experienceRes.count ?? 0);
              } catch {
                setDiggerPortfolioCount(0);
                setDiggerExperienceCount(0);
              }
            } else {
              setDiggerPortfolioCount(0);
              setDiggerExperienceCount(0);
            }
          }
        } catch (err) {
          setDiggerProfileForCompletion(null);
          console.warn('Error fetching digger profiles count:', err);
        }

        let leadsCount = 0;
        let activeLeadsCount = 0;
        
        if (primaryDiggerProfileId) {
          try {
            const { count: leadsCountResult, error: leadsError } = await supabase
              .from('lead_purchases')
              .select('id', { count: 'exact', head: true })
              .eq('digger_id', primaryDiggerProfileId);

            if (!leadsError) {
              leadsCount = leadsCountResult || 0;
            }

            const { count: activeLeadsCountResult, error: activeLeadsError } = await supabase
              .from('lead_purchases')
              .select('id', { count: 'exact', head: true })
              .eq('digger_id', primaryDiggerProfileId)
              .eq('status', 'active');

            if (!activeLeadsError) {
              activeLeadsCount = activeLeadsCountResult || 0;
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
            primaryProfileId: primaryDiggerProfileId,
            primaryProfileHandle: primaryDiggerProfileHandle,
          }
        }));
      }

      // Fetch Gigger stats (gigs count + whether profile is complete for create-first-profile)
      if (userRoles.includes('gigger')) {
        const [gigsRes, gpRes, profileRes] = await Promise.all([
          supabase.from('gigs').select('id', { count: 'exact', head: true }).eq('consumer_id', user.id),
          (supabase.from('gigger_profiles') as any).select('user_id').eq('user_id', user.id).limit(1).maybeSingle(),
          (supabase.from('profiles') as any).select('profile_title').eq('id', user.id).single(),
        ]);
        const giggerRow = (gpRes.data as { user_id?: string } | null);
        const profileTitle = (profileRes.data as { profile_title?: string } | null)?.profile_title?.trim();
        const hasGiggerProfile = !!giggerRow?.user_id && !!profileTitle;

        setStats(prev => ({
          ...prev,
          gigger: {
            gigsCount: gigsRes.count || 0,
            activeBidsCount: 0,
            awardedGigsCount: 0,
            hasGiggerProfile,
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

  const handleRegisterDigger = async () => {
    if (!user) return;

    try {
      // 1. Ensure Digger role is selected (add if missing)
      let hasDiggerRole = userRoles.includes('digger');
      if (!hasDiggerRole) {
        try {
          const { data: hasRole } = await supabase.rpc('has_app_role', { _user_id: user.id, _role: 'digger' });
          hasDiggerRole = hasRole === true;
        } catch {
          hasDiggerRole = false;
        }
      }

      if (!hasDiggerRole) {
        const { error: directInsertError } = await supabase
          .from('user_app_roles')
          .insert({ user_id: user.id, app_role: 'digger', is_active: true });
        if (directInsertError?.code === '42P17' || directInsertError?.message?.includes('infinite recursion')) {
          const { error: rpcError } = await (supabase.rpc as any)('insert_user_app_role', {
            p_user_id: user.id,
            p_app_role: 'digger',
          });
          if (rpcError) {
            toast({ title: "Error", description: "Failed to add Digger role.", variant: "destructive" });
            return;
          }
        } else if (directInsertError) {
          toast({ title: "Error", description: "Failed to add Digger role.", variant: "destructive" });
          return;
        }
        await refreshRoles();
      }

      await switchRole('digger');

      // 2. Redirect to complete your single profile
      const { data: existingProfiles } = await supabase
        .from('digger_profiles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!existingProfiles || existingProfiles.length === 0) {
        setFirstProfileDialogRole("digger");
      } else {
        goToProfileWorkspace(navigate);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    }
  };

  const handleRegisterGigger = async () => {
    if (!user) return;
    
    try {
      if (userRoles.includes('gigger')) {
        await switchRole('gigger');
        setFirstProfileDialogRole("gigger");
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
        setFirstProfileDialogRole("gigger");
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
        
        const { ensureGiggerProfile } = await import('@/lib/ensureGiggerProfile');
        await ensureGiggerProfile(user.id);
        
        await switchRole('gigger');
        toast({
          title: "Success",
          description: "Gigger role added! Complete your profile to post gigs.",
        });
        setFirstProfileDialogRole("gigger");
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
  
  const hasRoles = userRoles.length > 0;
  const diggerProfilesCount = stats.digger?.profilesCount ?? 0;
  const hasDiggerProfile = diggerProfilesCount > 0;
  const hasGiggerProfile = stats.gigger?.hasGiggerProfile ?? false;
  const diggerLeadsCount = stats.digger?.leadsCount ?? 0;
  const giggerGigsCount = stats.gigger?.gigsCount ?? 0;

  const nextAction = (() => {
    if (!hasRoles) {
      return {
        title: "Complete your setup",
        description: "Add your first role to start posting gigs or receiving leads.",
        ctaLabel: "Complete Setup",
        onClick: () => navigate("/register?complete=true"),
      };
    }

    if (userRoles.includes("digger") && !hasDiggerProfile) {
      return {
        title: "Set up your Digger profile",
        description: "A complete profile helps Giggers find and trust your services.",
        ctaLabel: "Set Up Profile",
        onClick: () => {
          void handleSwitchRole("digger");
          setFirstProfileDialogRole("digger");
        },
      };
    }

    if (userRoles.includes("gigger") && !hasGiggerProfile) {
      return {
        title: "Set up your Gigger profile",
        description: "Add a profile title and location so professionals can find you when you post gigs.",
        ctaLabel: "Set Up Profile",
        onClick: () => {
          void handleSwitchRole("gigger");
          setFirstProfileDialogRole("gigger");
        },
      };
    }

    if (userRoles.includes("gigger") && giggerGigsCount === 0) {
      return {
        title: "Post your first gig",
        description: "Describe your project and start receiving bids from qualified Diggers.",
        ctaLabel: "Post New Gig",
        onClick: () => {
          void handleSwitchRole("gigger");
          navigate("/post-gig");
        },
      };
    }

    if (userRoles.includes("digger") && diggerLeadsCount === 0) {
      return {
        title: "Get your first lead",
        description: "Browse gigs and unlock leads to start conversations with potential clients.",
        ctaLabel: "Browse Gigs",
        onClick: () => {
          void handleSwitchRole("digger");
          navigate("/browse-gigs");
        },
      };
    }

    return {
      title: "Stay active and responsive",
      description: "Reply quickly in Messages and keep your profile updated to improve win rates.",
      ctaLabel: "Open Messages",
      onClick: () => navigate("/messages"),
    };
  })();

  return (
    <PageLayout maxWidth="wide">
      <div className="space-y-8">
        <EmailVerificationBanner />
        
        <header className="animate-fade-in-up">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {nextAction.title}
          </p>
        </header>

        {/* Single primary action */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button onClick={nextAction.onClick} variant="default" className="w-full sm:w-auto">
            {nextAction.ctaLabel}
            <ArrowRight className="h-4 w-4 ml-2 shrink-0" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Digger */}
          <Card className="border shadow-none animate-fade-in-up">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Digger</CardTitle>
                  {activeRole === 'digger' && (
                    <span className="text-xs text-muted-foreground">· Active</span>
                  )}
                </div>
                {!userRoles.includes('digger') && (
                  <Button size="sm" variant="outline" onClick={handleRegisterDigger}>
                    Join
                  </Button>
                )}
              </div>
              {userRoles.includes('digger') && (
                <CardDescription className="text-xs mt-0.5">
                  Leads {stats.digger?.leadsCount ?? 0} · Active {stats.digger?.activeLeadsCount ?? 0}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {userRoles.includes('digger') ? (
                <>
                  {hasDiggerProfile && diggerProfileForCompletion && (() => {
                    const profileCompletion = computeDiggerProfileDetailCompletion({
                      ...(diggerProfileForCompletion as Record<string, unknown>),
                      portfolio_item_count: diggerPortfolioCount,
                      experience_count: diggerExperienceCount,
                    });
                    const { score } = profileCompletion;
                    return (
                      <div className="flex items-center gap-2 text-xs">
                        <Progress value={score} className="h-1.5 flex-1" />
                        <span className="text-muted-foreground shrink-0">{score}%</span>
                        <Button
                          size="sm"
                          variant={score >= 100 ? "ghost" : "default"}
                          className={
                            score >= 100
                              ? "h-7 text-xs shrink-0 -mr-1"
                              : "h-7 text-xs shrink-0 -mr-1 bg-orange-500 hover:bg-orange-600 text-white border-0"
                          }
                          onClick={() => {
                            handleSwitchRole('digger');
                            const path = getCanonicalDiggerProfilePath({
                              handle: stats.digger?.primaryProfileHandle ?? null,
                              diggerId: stats.digger?.primaryProfileId ?? null,
                            });
                            navigate(path ? `${path}?manage=1` : '/my-profiles');
                          }}
                        >
                          {score >= 100 ? "View profile" : "Complete"}
                        </Button>
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 min-w-0"
                      onClick={() => { handleSwitchRole('digger'); navigate('/my-leads'); }}
                    >
                      My Leads
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-w-0"
                      onClick={() => { handleSwitchRole('digger'); navigate('/my-bids'); }}
                    >
                      My Bids
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-w-0"
                      onClick={() => {
                        handleSwitchRole('digger');
                        if (!hasDiggerProfile) setFirstProfileDialogRole("digger");
                        else {
                          const path = getCanonicalDiggerProfilePath({
                            handle: stats.digger?.primaryProfileHandle ?? null,
                            diggerId: stats.digger?.primaryProfileId ?? null,
                          });
                          navigate(path ?? '/my-profiles');
                        }
                      }}
                    >
                      {hasDiggerProfile ? "Profile" : "Set up profile"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-w-0"
                      onClick={() => { handleSwitchRole('digger'); navigate('/browse-gigs'); }}
                    >
                      Browse
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Find gigs, unlock leads, get paid.
                  </p>
                  <Button size="sm" variant="outline" onClick={handleRegisterDigger}>
                    Register as Digger
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gigger */}
          <Card className="border shadow-none animate-fade-in-up">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Gigger</CardTitle>
                  {activeRole === 'gigger' && (
                    <span className="text-xs text-muted-foreground">· Active</span>
                  )}
                </div>
                {!userRoles.includes('gigger') && (
                  <Button size="sm" variant="outline" onClick={handleRegisterGigger}>
                    Join
                  </Button>
                )}
              </div>
              {userRoles.includes('gigger') && (
                <CardDescription className="text-xs mt-0.5">
                  Gigs {stats.gigger?.gigsCount ?? 0} · Awarded {stats.gigger?.awardedGigsCount ?? 0}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {userRoles.includes('gigger') ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 min-w-0"
                      onClick={() => { handleSwitchRole('gigger'); navigate('/my-gigs'); }}
                    >
                      My Gigs
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-w-0"
                      onClick={() => { handleSwitchRole('gigger'); navigate('/post-gig'); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Post gig
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-w-0"
                      onClick={() => {
                        handleSwitchRole('gigger');
                        if (!hasGiggerProfile) setFirstProfileDialogRole("gigger");
                        else if (user?.id) navigate(getCanonicalGiggerProfilePath(user.id));
                      }}
                    >
                      <User className="h-3.5 w-3.5 mr-1" />
                      {hasGiggerProfile ? 'Profile' : 'Set up profile'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Post gigs. Review bids. Award Diggers.
                  </p>
                  <Button size="sm" variant="outline" onClick={handleRegisterGigger}>
                    Register as Gigger
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {firstProfileDialogRole && (
        <FirstProfileDialog
          open={true}
          onOpenChange={(open) => !open && setFirstProfileDialogRole(null)}
          role={firstProfileDialogRole}
          user={user}
          onSuccess={() => fetchStats(true)}
        />
      )}

      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Welcome</DialogTitle>
            <DialogDescription className="text-sm">
              {userRoles.includes('gigger') && !userRoles.includes('digger')
                ? "Post a gig to get bids from Diggers."
                : "Complete your profile so clients can find you."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            {userRoles.includes('digger') && !hasDiggerProfile ? (
              <Button size="sm" onClick={() => { setShowWelcomeModal(false); setFirstProfileDialogRole("digger"); }}>
                Complete Digger profile
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : userRoles.includes('gigger') && !hasGiggerProfile ? (
              <Button size="sm" onClick={() => { setShowWelcomeModal(false); setFirstProfileDialogRole("gigger"); }}>
                Complete Gigger profile
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : userRoles.includes('digger') ? (
              <Button size="sm" onClick={() => { setShowWelcomeModal(false); goToProfileWorkspace(navigate); }}>
                Go to profile
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : userRoles.includes('gigger') ? (
              <Button size="sm" onClick={() => { setShowWelcomeModal(false); navigate('/post-gig'); }}>
                Post a gig
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => setShowWelcomeModal(false)}>
              Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
