import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Briefcase, Plus, ArrowRight, User, Link2, Copy, UserPlus, FileText, Search, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/PageLayout";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { goToProfileWorkspace } from "@/lib/profileWorkspaceRoute";
import { computeDiggerProfileDetailCompletion } from "@/lib/profileCompletion";
import { getCanonicalDiggerProfilePath, getCanonicalGiggerProfilePath } from "@/lib/profileUrls";
import { buildReferralLink, buildReferralCode } from "@/lib/referralUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { FirstProfileDialog } from "@/components/FirstProfileDialog";

interface RoleStats {
  digger?: {
    leadsCount: number;
    profilesCount: number;
    activeLeadsCount: number;
    bidsCount: number;
    awardedGigsCount: number;
    activeContractsCount: number;
    primaryProfileId?: string | null;
    primaryProfileHandle?: string | null;
  };
  gigger?: {
    gigsCount: number;
    activeBidsCount: number;
    awardedGigsCount: number;
    activeContractsCount: number;
    hasGiggerProfile: boolean;
  };
}

type PreviewSection =
  | "digger-leads"
  | "digger-bids"
  | "digger-awarded-gigs"
  | "digger-contracts"
  | "digger-browse"
  | "digger-profile"
  | "gigger-gigs"
  | "gigger-awarded-gigs"
  | "gigger-contracts"
  | "gigger-post"
  | "gigger-profile";

export default function RoleDashboard() {
  const { user, userRoles, activeRole, switchRole, loading: authLoading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [stats, setStats] = useState<RoleStats>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [diggerProfileForCompletion, setDiggerProfileForCompletion] = useState<Record<string, unknown> | null>(null);
  const [diggerPortfolioCount, setDiggerPortfolioCount] = useState(0);
  const [diggerExperienceCount, setDiggerExperienceCount] = useState(0);
  const [isCheckingRoles, setIsCheckingRoles] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [firstProfileDialogRole, setFirstProfileDialogRole] = useState<"digger" | "gigger" | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralsList, setReferralsList] = useState<{ id: string; status: string; referred_gig_id: string | null; referred_email: string | null; created_at: string }[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<PreviewSection | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLeads, setPreviewLeads] = useState<any[]>([]);
  const [previewBids, setPreviewBids] = useState<any[]>([]);
  const [previewContracts, setPreviewContracts] = useState<any[]>([]);
  const [previewGigs, setPreviewGigs] = useState<any[]>([]);
  const [previewAwardedGigs, setPreviewAwardedGigs] = useState<any[]>([]);
  const [previewBrowseGigs, setPreviewBrowseGigs] = useState<any[]>([]);
  const hasCheckedRolesRef = useRef(false);
  const hasFetchedStatsRef = useRef(false);
  
  // Memoize fetchStats to prevent recreation on every render
  const fetchStats = useCallback(async (forceRefresh = false) => {
    if (!user || userRoles.length === 0) {
      setStatsLoading(false);
      return;
    }
    
    if (hasFetchedStatsRef.current && !forceRefresh) return;
    
    hasFetchedStatsRef.current = true;
    
    try {
      setStatsLoading(true);
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
        let bidsCount = 0;
        let awardedGigsCount = 0;
        let activeContractsCount = 0;

        if (primaryDiggerProfileId) {
          try {
            const [leadsRes, activeLeadsRes, bidsRes, awardedRes, contractsRes] = await Promise.all([
              supabase.from('lead_purchases').select('id', { count: 'exact', head: true }).eq('digger_id', primaryDiggerProfileId),
              supabase.from('lead_purchases').select('id', { count: 'exact', head: true }).eq('digger_id', primaryDiggerProfileId).eq('status', 'active'),
              supabase.from('bids').select('id', { count: 'exact', head: true }).eq('digger_id', primaryDiggerProfileId),
              supabase.from('gigs').select('id', { count: 'exact', head: true }).eq('awarded_digger_id', primaryDiggerProfileId).eq('status', 'awarded'),
              supabase.from('escrow_contracts').select('id', { count: 'exact', head: true }).eq('digger_id', primaryDiggerProfileId).not('status', 'eq', 'completed'),
            ]);
            if (!leadsRes.error) leadsCount = leadsRes.count ?? 0;
            if (!activeLeadsRes.error) activeLeadsCount = activeLeadsRes.count ?? 0;
            if (!bidsRes.error) bidsCount = bidsRes.count ?? 0;
            if (!awardedRes.error) awardedGigsCount = awardedRes.count ?? 0;
            if (!contractsRes.error) activeContractsCount = contractsRes.count ?? 0;
          } catch (err) {
            console.warn('Error fetching digger counts:', err);
          }
        }

        setStats(prev => ({
          ...prev,
          digger: {
            profilesCount,
            leadsCount,
            activeLeadsCount,
            bidsCount,
            awardedGigsCount,
            activeContractsCount,
            primaryProfileId: primaryDiggerProfileId,
            primaryProfileHandle: primaryDiggerProfileHandle,
          }
        }));
      }

      // Fetch Gigger stats (gigs count + whether profile is complete for create-first-profile)
      if (userRoles.includes('gigger')) {
        const [gigsRes, gpRes, profileRes, awardedRes, contractsRes] = await Promise.all([
          supabase.from('gigs').select('id', { count: 'exact', head: true }).eq('consumer_id', user.id),
          (supabase as any).from('gigger_profiles').select('user_id').eq('user_id', user.id).limit(1).maybeSingle(),
          (supabase.from('profiles') as any).select('profile_title').eq('id', user.id).single(),
          supabase.from('gigs').select('id', { count: 'exact', head: true }).eq('consumer_id', user.id).eq('status', 'awarded').not('awarded_digger_id', 'is', null),
          supabase.from('escrow_contracts').select('id', { count: 'exact', head: true }).eq('consumer_id', user.id).not('status', 'eq', 'completed'),
        ]);
        const giggerRow = (gpRes.data as { user_id?: string } | null);
        const profileTitle = (profileRes.data as { profile_title?: string } | null)?.profile_title?.trim();
        const hasGiggerProfile = !!giggerRow?.user_id && !!profileTitle;

        setStats(prev => ({
          ...prev,
          gigger: {
            gigsCount: gigsRes.count || 0,
            activeBidsCount: 0,
            awardedGigsCount: awardedRes.count ?? 0,
            activeContractsCount: contractsRes.count ?? 0,
            hasGiggerProfile,
          }
        }));
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      hasFetchedStatsRef.current = false;
    } finally {
      setStatsLoading(false);
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
      setStatsLoading(false);
    }
  }, [authLoading, user?.id, userRoles.length, fetchStats]);

  // Load preview data when a section is selected
  useEffect(() => {
    if (!user || !selectedPreview) {
      setPreviewLeads([]);
      setPreviewBids([]);
      setPreviewContracts([]);
      setPreviewGigs([]);
      setPreviewAwardedGigs([]);
      setPreviewBrowseGigs([]);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    // Clear prior section data immediately to avoid stale content flashes.
    setPreviewLeads([]);
    setPreviewBids([]);
    setPreviewContracts([]);
    setPreviewGigs([]);
    setPreviewAwardedGigs([]);
    setPreviewBrowseGigs([]);
    (async () => {
      try {
        if (selectedPreview === "digger-leads" && stats.digger?.primaryProfileId) {
          const { data } = await supabase
            .from("lead_purchases")
            .select("id, status, purchased_at, gigs(id, title, status)")
            .eq("digger_id", stats.digger.primaryProfileId)
            .order("purchased_at", { ascending: false })
            .limit(50);
          if (!cancelled) setPreviewLeads(data ?? []);
        } else if (selectedPreview === "digger-bids" && stats.digger?.primaryProfileId) {
          const { data } = await supabase
            .from("bids")
            .select("id, gig_id, amount, status, created_at, gigs!gig_id(id, title, status)")
            .eq("digger_id", stats.digger.primaryProfileId)
            .order("created_at", { ascending: false })
            .limit(50);
          if (!cancelled) {
            const normalized = (data ?? []).map((b: any) => ({
              ...b,
              gigs: b.gigs ?? (b.gig_id ? { id: b.gig_id, title: "Project", status: "open" } : null),
            }));
            setPreviewBids(normalized);
          }
        } else if (selectedPreview === "digger-contracts" && stats.digger?.primaryProfileId) {
          const { data } = await supabase
            .from("escrow_contracts")
            .select("id, status, total_amount, created_at, gigs(id, title)")
            .eq("digger_id", stats.digger.primaryProfileId)
            .not("status", "eq", "completed")
            .order("created_at", { ascending: false })
            .limit(50);
          if (!cancelled) setPreviewContracts(data ?? []);
        } else if (selectedPreview === "digger-awarded-gigs" && stats.digger?.primaryProfileId) {
          const { data } = await supabase
            .from("gigs")
            .select("id, title, status, budget_min, budget_max, created_at")
            .eq("awarded_digger_id", stats.digger.primaryProfileId)
            .eq("status", "awarded")
            .order("created_at", { ascending: false })
            .limit(50);
          if (!cancelled) setPreviewAwardedGigs(data ?? []);
        } else if (selectedPreview === "digger-browse") {
          const { data } = await supabase
            .from("gigs")
            .select("id, title, status, budget_min, budget_max, created_at")
            .eq("status", "open")
            .order("created_at", { ascending: false })
            .limit(30);
          if (!cancelled) setPreviewBrowseGigs(data ?? []);
        } else if (selectedPreview === "gigger-gigs") {
          const { data } = await supabase
            .from("gigs")
            .select("id, title, status, budget_min, budget_max, created_at")
            .eq("consumer_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);
          if (!cancelled) setPreviewGigs(data ?? []);
        } else if (selectedPreview === "gigger-contracts") {
          const { data } = await supabase
            .from("escrow_contracts")
            .select("id, status, total_amount, created_at, gigs(id, title)")
            .eq("consumer_id", user.id)
            .not("status", "eq", "completed")
            .order("created_at", { ascending: false })
            .limit(50);
          if (!cancelled) setPreviewContracts(data ?? []);
        } else if (selectedPreview === "gigger-awarded-gigs") {
          const { data } = await supabase
            .from("gigs")
            .select("id, title, status, budget_min, budget_max, created_at")
            .eq("consumer_id", user.id)
            .eq("status", "awarded")
            .not("awarded_digger_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(50);
          if (!cancelled) setPreviewAwardedGigs(data ?? []);
        } else {
          if (!cancelled) {
            setPreviewLeads([]);
            setPreviewBids([]);
            setPreviewContracts([]);
            setPreviewGigs([]);
            setPreviewAwardedGigs([]);
            setPreviewBrowseGigs([]);
          }
        }
      } catch (err) {
        console.warn("Preview load error:", err);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, selectedPreview, stats.digger?.primaryProfileId]);

  const handleSwitchRole = async (role: 'digger' | 'gigger') => {
    await switchRole(role);
    toast({
      title: "Role switched",
      description: `You are now in ${role === 'digger' ? 'Digger' : 'Gigger'} mode`,
    });
  };

  const openPreviewForRole = async (role: "digger" | "gigger", section: PreviewSection) => {
    if (activeRole !== role) {
      await handleSwitchRole(role);
    }
    setSelectedPreview(section);
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
  const hasDiggerProfile = statsLoading ? true : diggerProfilesCount > 0;
  const hasGiggerProfile = statsLoading ? true : (stats.gigger?.hasGiggerProfile ?? false);
  const diggerLeadsCount = stats.digger?.leadsCount ?? 0;
  const giggerGigsCount = stats.gigger?.gigsCount ?? 0;
  const formatCount = (value: number | undefined) => (statsLoading ? "…" : String(value ?? 0));

  // Get or create referral link for diggers
  useEffect(() => {
    if (!user || !userRoles.includes("digger") || !stats.digger?.primaryProfileId) {
      setReferralLink(null);
      setReferralsList([]);
      return;
    }
    const diggerId = stats.digger.primaryProfileId;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setReferralLink(buildReferralLink(origin, diggerId));

    setReferralLoading(true);
    (supabase as any)
      .from("referrals")
      .upsert(
        { referrer_digger_id: diggerId, referral_code: buildReferralCode(diggerId) },
        { onConflict: "referral_code" }
      )
      .select("id")
      .single()
      .then(() => {})
      .catch(() => {})
      .finally(() => setReferralLoading(false));

    // Fetch recent referral activity so Digger can confirm who used their link
    supabase
      .from("referrals")
      .select("id, status, referred_gig_id, referred_email, created_at")
      .eq("referrer_digger_id", diggerId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setReferralsList(data ?? []));
  }, [user, userRoles, stats.digger?.primaryProfileId]);

  const nextAction = (() => {
    if (!hasRoles) {
      return {
        title: "Welcome to Digs & Gigs",
        description: "Choose how you want to use the platform: join as a Digger to find work or as a Gigger to hire.",
        ctaLabel: null as string | null,
        onClick: undefined,
      };
    }
    if (statsLoading) {
      return {
        title: "Loading your latest dashboard status…",
        description: "Fetching your current leads, gigs, contracts, and profile status.",
        ctaLabel: null as string | null,
        onClick: undefined,
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
      <div className="space-y-6 sm:space-y-8 min-w-0 overflow-x-hidden">
        <EmailVerificationBanner />
        
        <header className="animate-fade-in-up">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1 break-words">
            {nextAction.title}
          </p>
        </header>

        {/* Single primary action (hidden when no roles — user chooses Digger/Gigger from cards below) */}
        {nextAction.ctaLabel && nextAction.onClick && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button onClick={nextAction.onClick} variant="default" className="w-full sm:w-auto min-h-11 sm:min-h-0">
              {nextAction.ctaLabel}
              <ArrowRight className="h-4 w-4 ml-2 shrink-0" />
            </Button>
          </div>
        )}

        {statsLoading && hasRoles ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 min-w-0">
            <Card className="border shadow-none animate-fade-in-up min-w-0 overflow-hidden">
              <CardHeader className="px-4 py-3 sm:p-5 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-8 w-14" />
                </div>
                <Skeleton className="h-4 w-44 mt-2" />
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3 sm:p-5 sm:pt-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 flex-1" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full col-span-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-none animate-fade-in-up min-w-0 overflow-hidden">
              <CardHeader className="px-4 py-3 sm:p-5 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-8 w-14" />
                </div>
                <Skeleton className="h-4 w-52 mt-2" />
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3 sm:p-5 sm:pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full col-span-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 min-w-0">
          {/* Digger */}
          <Card className="border shadow-none animate-fade-in-up min-w-0 overflow-hidden">
            <CardHeader className="px-4 py-3 sm:p-5 pb-2">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Wrench className="h-5 w-5 text-muted-foreground shrink-0" />
                  <CardTitle className="text-base font-medium truncate">Digger</CardTitle>
                  {activeRole === 'digger' && (
                    <span className="text-xs text-muted-foreground shrink-0">· Active</span>
                  )}
                </div>
                {!userRoles.includes('digger') && (
                  <Button size="sm" variant="outline" onClick={handleRegisterDigger} className="shrink-0 min-h-9">
                    Join
                  </Button>
                )}
              </div>
              {userRoles.includes('digger') && (
                <CardDescription className="text-xs mt-0.5 break-words min-w-0">
                  Leads {formatCount(stats.digger?.leadsCount)} · Active {formatCount(stats.digger?.activeLeadsCount)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3 sm:p-5 sm:pt-0">
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
                      <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                        <Progress value={score} className="h-1.5 flex-1 min-w-0 basis-20" />
                        <span className="text-muted-foreground shrink-0 tabular-nums">{score}%</span>
                        <Button
                          size="sm"
                          variant={score >= 100 ? "ghost" : "default"}
                          className={
                            score >= 100
                              ? "h-8 sm:h-7 text-xs shrink-0 min-h-9 sm:min-h-0"
                              : "h-8 sm:h-7 text-xs shrink-0 min-h-9 sm:min-h-0 bg-orange-500 hover:bg-orange-600 text-white border-0"
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
                          {score >= 100 ? "View profile" : "Complete profile"}
                        </Button>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden"
                      onClick={async () => { await openPreviewForRole("digger", "digger-leads"); }}
                    >
                      <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                        <span className="truncate">My Leads</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">({formatCount(stats.digger?.leadsCount)})</span>
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden"
                      onClick={async () => { await openPreviewForRole("digger", "digger-bids"); }}
                    >
                      <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                        <span className="truncate">My Bids</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">({formatCount(stats.digger?.bidsCount)})</span>
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden"
                      onClick={async () => { await openPreviewForRole("digger", "digger-awarded-gigs"); }}
                    >
                      <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                        <span className="truncate">Awarded gigs</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">({formatCount(stats.digger?.awardedGigsCount)})</span>
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden"
                      onClick={async () => { await openPreviewForRole("digger", "digger-contracts"); }}
                    >
                      <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                        <span className="truncate">Active contracts</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">({formatCount(stats.digger?.activeContractsCount)})</span>
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden col-span-2"
                      onClick={async () => { await openPreviewForRole("digger", "digger-browse"); }}
                    >
                      Browse gigs
                    </Button>
                    {!hasDiggerProfile && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-10 w-full min-w-0 overflow-hidden col-span-2"
                        onClick={async () => { await openPreviewForRole("digger", "digger-profile"); }}
                      >
                        <User className="h-3.5 w-3.5 mr-1 shrink-0" />
                        <span className="truncate">Set up profile</span>
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-5 sm:py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Find gigs, unlock leads, get paid.
                  </p>
                  <Button size="sm" variant="outline" onClick={handleRegisterDigger} className="min-h-10 sm:min-h-0">
                    Register as Digger
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gigger */}
          <Card className="border shadow-none animate-fade-in-up min-w-0 overflow-hidden">
            <CardHeader className="px-4 py-3 sm:p-5 pb-2">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
                  <CardTitle className="text-base font-medium truncate">Gigger</CardTitle>
                  {activeRole === 'gigger' && (
                    <span className="text-xs text-muted-foreground shrink-0">· Active</span>
                  )}
                </div>
                {!userRoles.includes('gigger') && (
                  <Button size="sm" variant="outline" onClick={handleRegisterGigger} className="shrink-0 min-h-9">
                    Join
                  </Button>
                )}
              </div>
              {userRoles.includes('gigger') && (
                <CardDescription className="text-xs mt-0.5 break-words min-w-0">
                  Gigs {formatCount(stats.gigger?.gigsCount)} · Awarded {formatCount(stats.gigger?.awardedGigsCount)} · Active contracts {formatCount(stats.gigger?.activeContractsCount)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3 sm:p-5 sm:pt-0">
              {userRoles.includes('gigger') ? (
                <>
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden"
                      onClick={async () => { await openPreviewForRole("gigger", "gigger-gigs"); }}
                    >
                      <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                        <span className="truncate">My Gigs</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">({formatCount(stats.gigger?.gigsCount)})</span>
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden"
                      onClick={async () => { await openPreviewForRole("gigger", "gigger-post"); }}
                    >
                      <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                        <span className="truncate">Post gig</span>
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden"
                      onClick={async () => { await openPreviewForRole("gigger", "gigger-awarded-gigs"); }}
                    >
                      <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                        <span className="truncate">Awarded gigs</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">({formatCount(stats.gigger?.awardedGigsCount)})</span>
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 overflow-hidden"
                      onClick={async () => { await openPreviewForRole("gigger", "gigger-contracts"); }}
                    >
                      <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                        <span className="truncate">Active contracts</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">({formatCount(stats.gigger?.activeContractsCount)})</span>
                      </span>
                    </Button>
                    {!hasGiggerProfile && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-10 w-full min-w-0 overflow-hidden col-span-2"
                        onClick={async () => { await openPreviewForRole("gigger", "gigger-profile"); }}
                      >
                        <span className="inline-flex items-center justify-center gap-1 min-w-0 max-w-full flex-wrap">
                          <span className="truncate">Set up profile</span>
                        </span>
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-5 sm:py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Post gigs. Review bids. Award Diggers.
                  </p>
                  <Button size="sm" variant="outline" onClick={handleRegisterGigger} className="min-h-10 sm:min-h-0">
                    Register as Gigger
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Referral link for Diggers - show only when Digger mode is active */}
        {activeRole === "digger" && userRoles.includes("digger") && hasDiggerProfile && referralLink && (
          <Card className="border shadow-none animate-fade-in-up min-w-0 overflow-hidden">
            <CardHeader className="px-4 py-3 sm:p-5 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <CardTitle className="text-base font-medium">Your referral link</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Share this link with clients. When they post a project, you get attributed.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 sm:p-5 sm:pt-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 min-w-0 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 min-h-10"
                  disabled={referralLoading}
                  onClick={() => {
                    if (referralLink) {
                      navigator.clipboard.writeText(referralLink);
                      toast({ title: "Copied", description: "Referral link copied to clipboard." });
                    }
                  }}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy
                </Button>
              </div>

              {/* Recent referral activity - confirm who used your link */}
              {referralsList.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recent referral activity</p>
                  <ul className="space-y-1.5 text-xs">
                    {referralsList.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                        <span className="truncate">
                          {r.status === "converted" ? (
                            <>Project posted{r.referred_email ? ` (${r.referred_email})` : ""}</>
                          ) : (
                            <>Link clicked{r.referred_email ? ` (${r.referred_email})` : ""}</>
                          )}
                        </span>
                        <span className="shrink-0 text-muted-foreground/80">
                          {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    &quot;Project posted&quot; = someone you referred completed a gig. You get credit.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        </div>

      {/* Right-side preview sheet (Lead Cart style) */}
      <Sheet open={!!selectedPreview} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pr-12 pb-2 text-left border-b">
            <SheetTitle className="flex items-center gap-2">
              {selectedPreview === "digger-leads" && <UserPlus className="h-5 w-5" />}
              {selectedPreview === "digger-bids" && <FileText className="h-5 w-5" />}
              {(selectedPreview === "digger-contracts" || selectedPreview === "gigger-contracts") && <FileText className="h-5 w-5" />}
              {selectedPreview === "digger-browse" && <Search className="h-5 w-5" />}
              {selectedPreview === "gigger-gigs" && <Briefcase className="h-5 w-5" />}
              {(selectedPreview === "digger-awarded-gigs" || selectedPreview === "gigger-awarded-gigs") && <ShoppingBag className="h-5 w-5" />}
              {(selectedPreview === "gigger-post" || selectedPreview === "gigger-profile" || selectedPreview === "digger-profile") && <User className="h-5 w-5" />}
              {selectedPreview === "digger-leads" && "My Leads"}
              {selectedPreview === "digger-bids" && "My Bids"}
              {(selectedPreview === "digger-awarded-gigs" || selectedPreview === "gigger-awarded-gigs") && "Awarded gigs"}
              {(selectedPreview === "digger-contracts" || selectedPreview === "gigger-contracts") && "Active contracts"}
              {selectedPreview === "digger-browse" && "Browse gigs"}
              {selectedPreview === "gigger-gigs" && "My Gigs"}
              {selectedPreview === "digger-profile" && "Set up profile"}
              {selectedPreview === "gigger-post" && "Post a gig"}
              {selectedPreview === "gigger-profile" && "Set up profile"}
            </SheetTitle>
            <SheetDescription>
              {selectedPreview === "digger-leads" && "Review your leads and contact info."}
              {selectedPreview === "digger-bids" && "Your bids on gigs. View status and manage."}
              {(selectedPreview === "digger-awarded-gigs" || selectedPreview === "gigger-awarded-gigs") && "Gigs that have already been awarded."}
              {(selectedPreview === "digger-contracts" || selectedPreview === "gigger-contracts") && "Your active payment contracts and milestones."}
              {selectedPreview === "digger-browse" && "Open gigs you can bid on."}
              {selectedPreview === "gigger-gigs" && "Your posted gigs and their status."}
              {(selectedPreview === "gigger-post" || selectedPreview === "gigger-profile" || selectedPreview === "digger-profile") && "Complete this step to get started."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {(selectedPreview === "gigger-post" || selectedPreview === "gigger-profile" || selectedPreview === "digger-profile") && (
              <p className="text-sm text-muted-foreground mb-3">
                {selectedPreview === "gigger-post" && "Create a new project and receive bids from Diggers."}
                {selectedPreview === "gigger-profile" && "Add a profile title and location so professionals can find you."}
                {selectedPreview === "digger-profile" && "Complete your Digger profile so clients can find and hire you."}
              </p>
            )}
            {previewLoading && (
              <div className="space-y-3 py-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-9 w-full mt-2" />
              </div>
            )}
            {!previewLoading && selectedPreview === "digger-leads" && (
              <>
                {previewLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No leads yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Browse gigs and unlock leads to contact clients.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {previewLeads.map((lead: any) => (
                      <li
                        key={lead.id}
                        className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-sm px-1"
                        onClick={() => {
                          const gigId = lead?.gigs?.id;
                          if (!gigId) return;
                          setSelectedPreview(null);
                          navigate(`/gig/${gigId}`);
                        }}
                      >
                        <span className="font-medium truncate">{lead.gigs?.title ?? "Gig"}</span>
                        <span className="text-xs text-muted-foreground">
                          {lead.purchased_at ? new Date(lead.purchased_at).toLocaleDateString() : ""} · {String(lead.status ?? "").replace(/_/g, " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="sm" className="w-full mt-4" onClick={() => { handleSwitchRole("digger"); setSelectedPreview(null); navigate("/my-leads"); }}>
                  View all
                </Button>
              </>
            )}
            {!previewLoading && selectedPreview === "digger-bids" && (
              <>
                {previewBids.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No bids yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Browse gigs and submit bids to get hired.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {previewBids.map((bid: any) => (
                      <li
                        key={bid.id}
                        className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-sm px-1"
                        onClick={() => {
                          const gigId = bid?.gigs?.id;
                          if (!gigId) return;
                          setSelectedPreview(null);
                          navigate(`/gig/${gigId}`);
                        }}
                      >
                        <span className="font-medium truncate">{bid.gigs?.title ?? "Gig"}</span>
                        <span className="text-xs text-muted-foreground">
                          ${Number(bid.amount ?? 0).toLocaleString()} · {String(bid.status ?? "").replace(/_/g, " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="sm" className="w-full mt-4" onClick={() => { handleSwitchRole("digger"); setSelectedPreview(null); navigate("/my-bids"); }}>
                  View all
                </Button>
              </>
            )}
            {!previewLoading && (selectedPreview === "digger-contracts" || selectedPreview === "gigger-contracts") && (
              <>
                {previewContracts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No active contracts</p>
                    <p className="text-sm text-muted-foreground mt-1">Contracts appear here when you start a paid project.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {previewContracts.map((c: any) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-sm px-1"
                        onClick={() => {
                          const gigId = c?.gigs?.id;
                          if (!gigId) return;
                          setSelectedPreview(null);
                          navigate(`/gig/${gigId}`);
                        }}
                      >
                        <span className="font-medium truncate">{c.gigs?.title ?? "Contract"}</span>
                        <span className="text-xs text-muted-foreground">
                          ${Number(c.total_amount ?? 0).toLocaleString()} · {String(c.status ?? "").replace(/_/g, " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="sm" className="w-full mt-4" onClick={() => { handleSwitchRole(selectedPreview === "digger-contracts" ? "digger" : "gigger"); setSelectedPreview(null); navigate("/escrow-dashboard"); }}>
                  View all
                </Button>
              </>
            )}
            {!previewLoading && selectedPreview === "digger-browse" && (
              <>
                {previewBrowseGigs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No open gigs right now</p>
                    <p className="text-sm text-muted-foreground mt-1">Check back later for new projects.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {previewBrowseGigs.map((g: any) => (
                      <li
                        key={g.id}
                        className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-sm px-1"
                        onClick={() => {
                          if (!g?.id) return;
                          setSelectedPreview(null);
                          navigate(`/gig/${g.id}`);
                        }}
                      >
                        <span className="font-medium truncate">{g.title ?? "Gig"}</span>
                        <span className="text-xs text-muted-foreground">
                          {g.budget_min != null || g.budget_max != null
                            ? `$${Number(g.budget_min ?? 0).toLocaleString()}–${Number(g.budget_max ?? 0).toLocaleString()}`
                            : "Open"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="sm" className="w-full mt-4" onClick={() => { handleSwitchRole("digger"); setSelectedPreview(null); navigate("/browse-gigs"); }}>
                  View all
                </Button>
              </>
            )}
            {!previewLoading && selectedPreview === "gigger-gigs" && (
              <>
                {previewGigs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No gigs yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Post your first gig to receive bids from Diggers.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {previewGigs.map((g: any) => (
                      <li
                        key={g.id}
                        className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-sm px-1"
                        onClick={() => {
                          if (!g?.id) return;
                          setSelectedPreview(null);
                          navigate(`/gig/${g.id}`);
                        }}
                      >
                        <span className="font-medium truncate">{g.title ?? "Gig"}</span>
                        <span className="text-xs text-muted-foreground">
                          {String(g.status ?? "").replace(/_/g, " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="sm" className="w-full mt-4" onClick={() => { handleSwitchRole("gigger"); setSelectedPreview(null); navigate("/my-gigs"); }}>
                  View all
                </Button>
              </>
            )}
            {!previewLoading && (selectedPreview === "digger-awarded-gigs" || selectedPreview === "gigger-awarded-gigs") && (
              <>
                {previewAwardedGigs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No awarded gigs yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Awarded gigs will appear here once a freelancer is selected.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {previewAwardedGigs.map((g: any) => (
                      <li
                        key={g.id}
                        className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-sm px-1"
                        onClick={() => {
                          if (!g?.id) return;
                          setSelectedPreview(null);
                          navigate(`/gig/${g.id}`);
                        }}
                      >
                        <span className="font-medium truncate">{g.title ?? "Gig"}</span>
                        <span className="text-xs text-muted-foreground">
                          {String(g.status ?? "").replace(/_/g, " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => {
                    if (selectedPreview === "digger-awarded-gigs") {
                      handleSwitchRole("digger");
                      setSelectedPreview(null);
                      navigate("/my-bids");
                    } else {
                      handleSwitchRole("gigger");
                      setSelectedPreview(null);
                      navigate("/my-gigs");
                    }
                  }}
                >
                  View all
                </Button>
              </>
            )}
            {!previewLoading && (selectedPreview === "gigger-post" || selectedPreview === "gigger-profile" || selectedPreview === "digger-profile") && (
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  if (selectedPreview === "gigger-post") { setSelectedPreview(null); navigate("/post-gig"); }
                  else if (selectedPreview === "gigger-profile") { setFirstProfileDialogRole("gigger"); setSelectedPreview(null); }
                  else { setFirstProfileDialogRole("digger"); setSelectedPreview(null); }
                }}
              >
                {selectedPreview === "gigger-post" ? "Post a gig" : "Set up profile"}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
