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
  MessageCircle,
  ShieldCheck,
  MailCheck,
  Settings,
  Award
} from "lucide-react";
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
        navigate('/create-first-profile');
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
        
        const { ensureGiggerProfile } = await import('@/lib/ensureGiggerProfile');
        await ensureGiggerProfile(user.id);
        
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
  
  const hasRoles = userRoles.length > 0;
  const isEmailVerified = Boolean(user?.email_confirmed_at);
  const diggerProfilesCount = stats.digger?.profilesCount ?? 0;
  const hasDiggerProfile = diggerProfilesCount > 0;
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
          navigate("/create-first-profile");
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

        {/* Next Best Action */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5 animate-fade-in-up stagger-1">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="p-2.5 rounded-lg bg-primary/10 w-fit">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Next best action</p>
                <h2 className="text-lg font-semibold text-foreground">{nextAction.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{nextAction.description}</p>
              </div>
              <Button onClick={nextAction.onClick} className="shrink-0">
                {nextAction.ctaLabel}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

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
                      <>
                        <Badge variant="secondary" className="font-medium">
                          Not Registered
                        </Badge>
                        <Button
                          size="sm"
                          className="ml-auto"
                          onClick={handleRegisterDigger}
                        >
                          Register as Freelancer
                        </Button>
                      </>
                    )}
                  </div>
                  <CardDescription className="mt-1">Build one strong profile, unlock leads, and win more gigs</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-5">
              {userRoles.includes('digger') ? (
                <>
                  {/* Profile completion - visible when Digger has a profile (same 10 factors as profile detail page) */}
                  {hasDiggerProfile && diggerProfileForCompletion && (() => {
                    const profileCompletion = computeDiggerProfileDetailCompletion({
                      ...(diggerProfileForCompletion as Record<string, unknown>),
                      portfolio_item_count: diggerPortfolioCount,
                      experience_count: diggerExperienceCount,
                    });
                    const { score, items } = profileCompletion;
                    const completedCount = items.filter((i) => i.completed).length;
                    return (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Profile completion</span>
                          </div>
                          <Badge variant={score >= 80 ? "default" : "secondary"}>{score}%</Badge>
                        </div>
                        <Progress value={score} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {completedCount}/10 complete
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
                          {items.map((item) => (
                            <span key={item.id} className="flex items-center gap-1.5 shrink-0">
                              {item.completed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                              ) : (
                                <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/50" />
                              )}
                              <span className={item.completed ? "text-muted-foreground" : "text-foreground"}>{item.label}</span>
                            </span>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            handleSwitchRole('digger');
                            const path = getCanonicalDiggerProfilePath({
                              handle: stats.digger?.primaryProfileHandle ?? null,
                              diggerId: stats.digger?.primaryProfileId ?? null,
                            });
                            navigate(path ? `${path}?manage=1` : '/my-profiles');
                          }}
                        >
                          {score >= 100 ? "View profile" : "Complete profile"}
                          <ArrowRight className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </div>
                    );
                  })()}
                  {/* Stats Grid - Total Leads & Active only (one profile per Digger, so no Profile count) */}
                  <div className="grid grid-cols-2 gap-4">
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
                          if (!hasDiggerProfile) {
                            navigate('/create-first-profile');
                          } else {
                            const path = getCanonicalDiggerProfilePath({
                              handle: stats.digger?.primaryProfileHandle ?? null,
                              diggerId: stats.digger?.primaryProfileId ?? null,
                            });
                            navigate(path ?? '/my-profiles');
                          }
                        }}
                      >
                        {hasDiggerProfile ? "My Profile" : "Set Up Profile"}
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          handleSwitchRole('digger');
                          navigate('/browse-gigs');
                        }}
                      >
                        Browse Gigs
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
                    Find gigs, bid or buy leads, and chat with Giggers. No membership—pay per lead or 8% when awarded.
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
                      <>
                        <Badge variant="secondary" className="font-medium">
                          Not Registered
                        </Badge>
                        <Button
                          size="sm"
                          variant="hero"
                          className="ml-auto"
                          onClick={handleRegisterGigger}
                        >
                          Register as Client
                        </Button>
                      </>
                    )}
                  </div>
                  <CardDescription className="mt-1">Post gigs, review bids, award Diggers</CardDescription>
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
                          if (user?.id) {
                            navigate(getCanonicalGiggerProfilePath(user.id));
                          }
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
                    Post gigs for free. Diggers will bid—review and award when you're ready.
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
                    You can be both a Digger and a Gigger. Switch roles anytime to find gigs or post your own.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Health & Trust */}
        <Card className="animate-fade-in-up stagger-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Account Health & Trust
            </CardTitle>
            <CardDescription>
              Keep your account complete and communication active for better results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium text-foreground mb-1">Email verification</p>
                <div className="flex items-center gap-2">
                  {isEmailVerified ? (
                    <>
                      <Badge className="bg-green-600/10 text-green-700 dark:text-green-400 border-0">Verified</Badge>
                      <span className="text-xs text-muted-foreground">Your account is ready for secure communication.</span>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">Action needed</Badge>
                      <span className="text-xs text-muted-foreground">Verify email to improve trust and deliverability.</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-medium text-foreground mb-1">Role readiness</p>
                <p className="text-xs text-muted-foreground">
                  {hasRoles
                    ? `You have ${userRoles.length} active ${userRoles.length === 1 ? "role" : "roles"}.`
                    : "No active roles yet. Add one role to unlock core workflows."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {userRoles.length > 0 ? (
                    userRoles.map((role) => (
                      <Badge key={role} variant="outline" className="capitalize">{role}</Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No roles</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => navigate("/account")}>
                <Settings className="h-4 w-4 mr-2" />
                Account settings
              </Button>
              <Button variant="outline" onClick={() => navigate("/messages")}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Messages
              </Button>
              <Button variant="outline" onClick={() => navigate("/contact")}>
                <MailCheck className="h-4 w-4 mr-2" />
                Contact support
              </Button>
            </div>
          </CardContent>
        </Card>
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
                <DialogTitle className="text-center text-xl">Welcome, Gigger!</DialogTitle>
                <DialogDescription className="text-center text-base">
                  Post your first gig—Diggers will bid and you'll see proposals here. Award when you're ready and chat in Messages.
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle className="text-center text-xl">Welcome to Digs & Gigs!</DialogTitle>
                <DialogDescription className="text-center text-base">
                  Complete your profile so Giggers can find you. Add a photo, services, and details to stand out and get awarded.
                </DialogDescription>
              </>
            )}
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {userRoles.includes('digger') ? (
              <Button onClick={() => { setShowWelcomeModal(false); if (diggerProfilesCount === 0) navigate('/create-first-profile'); else goToProfileWorkspace(navigate); }} className="w-full sm:w-auto">
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
