import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Star, Edit, Trash2, RefreshCw, Briefcase, TrendingUp, Users, Lightbulb, User, Save, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { retryWithBackoff } from "@/utils/retryWithBackoff";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";

interface ProfileWithStats {
  id: string;
  profile_name: string | null;
  business_name: string;
  profession: string;
  is_primary: boolean;
  average_rating: number | null;
  total_ratings: number | null;
  profile_image_url: string | null;
  subscription_tier: string | null;
  created_at: string;
  total_bids?: number;
  active_leads?: number;
}

export default function MyProfiles() {
  const { user, activeRole, userRoles, switchRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<ProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; profileId: string | null }>({
    open: false,
    profileId: null,
  });

  // Gigger simple profile state (photo + about me)
  const [giggerPhotoUrl, setGiggerPhotoUrl] = useState("");
  const [giggerAboutMe, setGiggerAboutMe] = useState("");
  const [giggerSaving, setGiggerSaving] = useState(false);
  const [giggerProfileLoading, setGiggerProfileLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const isDiggerView = activeRole === "digger";
  const isGiggerView = activeRole === "gigger";
  const hasDiggerRole = userRoles.includes("digger");
  const hasGiggerRole = userRoles.includes("gigger");

  const handleCreateNewProfile = () => {
    navigate("/create-digger-profile");
  };

  useEffect(() => {
    if (user && isDiggerView) {
      loadProfiles();
    } else if (user && isGiggerView) {
      loadGiggerProfile();
    } else {
      setLoading(false);
      setGiggerProfileLoading(false);
    }
  }, [user, isDiggerView, isGiggerView]);

  // Refresh profiles if coming from registration (digger only)
  useEffect(() => {
    const justRegistered = searchParams.get('registered') === 'true';
    if (justRegistered && user && isDiggerView) {
      setShowWelcomeModal(true);
      console.log('Just registered, refreshing profiles...');
      setLoading(true);
      
      const retryLoadProfiles = async (attempt = 1, maxAttempts = 3) => {
        try {
          await loadProfiles();
          
          setTimeout(async () => {
            const { data: checkProfiles } = await supabase
              .from("digger_profiles")
              .select("id")
              .eq("user_id", user.id)
              .limit(1);
            
            if ((!checkProfiles || checkProfiles.length === 0) && attempt < maxAttempts) {
              console.log(`No profiles found, retrying... (attempt ${attempt + 1}/${maxAttempts})`);
              setTimeout(() => retryLoadProfiles(attempt + 1, maxAttempts), 1000 * attempt);
            } else {
              searchParams.delete('registered');
              setSearchParams(searchParams, { replace: true });
            }
          }, 500);
        } catch (error) {
          console.error('Error loading profiles after registration:', error);
          if (attempt < maxAttempts) {
            setTimeout(() => retryLoadProfiles(attempt + 1, maxAttempts), 1000 * attempt);
          } else {
            searchParams.delete('registered');
            setSearchParams(searchParams, { replace: true });
          }
        }
      };
      
      setTimeout(() => {
        retryLoadProfiles();
      }, 800);
    }
  }, [user, searchParams, setSearchParams, isDiggerView]);

  // Refresh profiles when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        if (isDiggerView) {
          loadProfiles();
        } else if (isGiggerView) {
          loadGiggerProfile();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isDiggerView, isGiggerView]);

  const loadProfiles = async () => {
    if (!user) {
      console.log("MyProfiles: No user, cannot load profiles");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("MyProfiles: Loading profiles for user:", user.id);
      
      const { data: profileCheck, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      
      if (profileError) {
        console.error("MyProfiles: Error checking profiles table:", profileError);
      }
      
      const { data: profilesData, error } = await retryWithBackoff(
        async () => {
          const result = await supabase
            .from("digger_profiles")
            .select("*")
            .eq("user_id", user.id)
            .order("is_primary", { ascending: false })
            .order("created_at", { ascending: true });
          
          if (result.error) {
            throw result.error;
          }
          return result;
        },
        { maxAttempts: 3, initialDelay: 1000 }
      );

      if (error) throw error;

      if (profilesData) {
        const profilesWithStats = await Promise.all(
          profilesData.map(async (profile) => {
            try {
              const [bidsResult, leadsResult] = await Promise.all([
                retryWithBackoff(
                  async () => {
                    const result = await supabase.from("bids").select("", { count: "exact", head: true }).eq("digger_id", profile.id);
                    return result;
                  },
                  { maxAttempts: 2, initialDelay: 500 }
                ),
                retryWithBackoff(
                  async () => {
                    const result = await supabase.from("lead_purchases").select("", { count: "exact", head: true }).eq("digger_id", profile.id).eq("status", "completed");
                    return result;
                  },
                  { maxAttempts: 2, initialDelay: 500 }
                ),
              ]);

              return {
                ...profile,
                total_bids: bidsResult.count || 0,
                active_leads: leadsResult.count || 0,
              };
            } catch (statsError) {
              console.error("Error fetching stats for profile:", profile.id, statsError);
              return {
                ...profile,
                total_bids: 0,
                active_leads: 0,
              };
            }
          })
        );

        setProfiles(profilesWithStats);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast.error("Failed to load profiles. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const loadGiggerProfile = async () => {
    if (!user) {
      setGiggerProfileLoading(false);
      return;
    }
    setGiggerProfileLoading(true);
    try {
      const [profileResult, diggerResult] = await Promise.all([
        supabase.from("profiles").select("avatar_url, about_me").eq("id", user.id).maybeSingle(),
        supabase.from("digger_profiles").select("profile_image_url").eq("user_id", user.id).not("profile_image_url", "is", null).limit(1).maybeSingle(),
      ]);
      const profile = profileResult.data;
      const error = profileResult.error;
      const authPhoto = (user as any).user_metadata?.avatar_url || (user as any).user_metadata?.picture || null;
      const diggerPhoto = diggerResult.data?.profile_image_url || null;
      const photoUrl = profile?.avatar_url || authPhoto || diggerPhoto || "";
      setGiggerPhotoUrl(photoUrl);
      setGiggerAboutMe((profile as any)?.about_me || "");
      if (error) throw error;
    } catch (error) {
      console.error("Error loading gigger profile:", error);
      const authPhoto = (user as any).user_metadata?.avatar_url || (user as any).user_metadata?.picture || null;
      const { data: diggerProfile } = await supabase.from("digger_profiles").select("profile_image_url").eq("user_id", user.id).not("profile_image_url", "is", null).limit(1).maybeSingle();
      setGiggerPhotoUrl(authPhoto || diggerProfile?.profile_image_url || "");
      setGiggerAboutMe("");
    } finally {
      setGiggerProfileLoading(false);
    }
  };

  const handleGiggerPhotoChange = async (url: string) => {
    setGiggerPhotoUrl(url);
    if (!user) return;
    try {
      const existingMetadata = user.user_metadata || {};
      await supabase.auth.updateUser({
        data: { ...existingMetadata, avatar_url: url || "", picture: url || "" },
      });
      await supabase.from("profiles").update({ avatar_url: url || null }).eq("id", user.id);
      await supabase.from("digger_profiles").update({ profile_image_url: url || null }).eq("user_id", user.id);
    } catch (e) {
      console.warn("Failed to sync photo:", e);
    }
  };

  const handleSaveGiggerProfile = async () => {
    if (!user) return;
    setGiggerSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          about_me: giggerAboutMe.trim() || null,
          avatar_url: giggerPhotoUrl || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile saved");
    } catch (error) {
      console.error("Error saving gigger profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setGiggerSaving(false);
    }
  };

  const handleSetPrimary = async (profileId: string) => {
    if (!user) return;

    try {
      await retryWithBackoff(async () => {
        await supabase.from("digger_profiles").update({ is_primary: false }).eq("user_id", user.id);
        const { error } = await supabase.from("digger_profiles").update({ is_primary: true }).eq("id", profileId);
        if (error) throw error;
      });

      toast.success("Primary profile updated");
      loadProfiles();
    } catch (error) {
      console.error("Error setting primary profile:", error);
      toast.error("Failed to set primary profile - please check your connection");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.profileId) return;

    try {
      await retryWithBackoff(async () => {
        const { error } = await supabase.from("digger_profiles").delete().eq("id", deleteDialog.profileId);
        if (error) throw error;
      });

      toast.success("Profile deleted successfully");
      setDeleteDialog({ open: false, profileId: null });
      loadProfiles();
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error("Failed to delete profile - please check your connection");
    }
  };

  const getProfileDisplayName = (profile: ProfileWithStats) => {
    if (profile.profile_name) return profile.profile_name;
    if (profile.business_name) return profile.business_name;
    if (profile.profession) return profile.profession;
    return "Unnamed Profile";
  };

  const getTierBadgeVariant = (tier: string | null): "default" | "secondary" | "outline" => {
    switch (tier) {
      case "premium":
        return "default";
      case "pro":
        return "secondary";
      default:
        return "outline";
    }
  };

  const isLoading = (isDiggerView && loading) || (isGiggerView && giggerProfileLoading);

  if (isLoading) {
    return (
      <PageLayout maxWidth="wide">
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">
              {isGiggerView ? "Loading your profile..." : "Loading your profiles..."}
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Show role switch prompt when user has both roles but current view doesn't match
  if (!isDiggerView && !isGiggerView) {
    return (
      <PageLayout maxWidth="wide">
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Switch to Digger or Gigger to manage your profile.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {hasDiggerRole && (
                <Button onClick={() => switchRole("digger")} variant="outline" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Switch to Digger
                </Button>
              )}
              {hasGiggerRole && (
                <Button onClick={() => switchRole("gigger")} variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  Switch to Gigger
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Gigger view: simple photo + about me
  if (isGiggerView) {
    return (
      <PageLayout maxWidth="wide">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            Add a photo and a short intro so professionals know who they&apos;re working with
          </p>
        </div>

        {/* Role switcher when user has both roles */}
        {hasDiggerRole && (
          <Card className="mb-6 border-primary/20 animate-fade-in-up">
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  You also have Digger profiles. Switch to manage them.
                </p>
                <Button variant="outline" size="sm" onClick={() => switchRole("digger")} className="gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  Switch to Digger
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="max-w-2xl animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Profile
            </CardTitle>
            <CardDescription>
              A simple profile helps build trust when posting projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfilePhotoUpload
              currentPhotoUrl={giggerPhotoUrl}
              onPhotoChange={handleGiggerPhotoChange}
              companyName={(user as any)?.user_metadata?.full_name}
            />
            <div className="space-y-2">
              <Label htmlFor="about-me">About Me</Label>
              <Textarea
                id="about-me"
                placeholder="A brief intro about yourself or your project needs (optional)"
                value={giggerAboutMe}
                onChange={(e) => setGiggerAboutMe(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <Button onClick={handleSaveGiggerProfile} disabled={giggerSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {giggerSaving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Welcome modal after registration (Gigger view) */}
        <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <Briefcase className="h-8 w-8 text-accent" />
              </div>
              <DialogTitle className="text-center text-xl">Welcome, Project Poster!</DialogTitle>
              <DialogDescription className="text-center text-base">
                You&apos;re ready to find talented professionals for your projects. Add your photo and a short intro here to build trust when you connect with service providers. You can post your first gig anytime from the dashboard.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => { setShowWelcomeModal(false); }} className="w-full sm:w-auto">
                Complete My Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => { setShowWelcomeModal(false); navigate('/post-gig'); }} className="w-full sm:w-auto">
                Post a Gig Instead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageLayout>
    );
  }

  // Digger view: multiple profiles
  return (
    <PageLayout maxWidth="wide">
      {/* Header Section */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
              My Profiles
            </h1>
            <p className="text-muted-foreground">
              Manage your service provider profiles and track performance
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={loadProfiles} 
              disabled={loading}
              className="gap-2"
              title="Refresh profiles"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleCreateNewProfile} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Create Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Role switcher when user has both roles */}
      {hasGiggerRole && (
        <Card className="mb-6 border-accent/20 animate-fade-in-up">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                You also have a Gigger profile. Switch to edit it.
              </p>
              <Button variant="outline" size="sm" onClick={() => switchRole("gigger")} className="gap-1.5">
                <User className="h-3.5 w-3.5" />
                Switch to Gigger
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pro Tip Banner */}
      <Card className="mb-8 border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <CardContent className="py-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Lightbulb className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Why Multiple Profiles?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Create multiple profiles to organize your services, target different locations, or market separate specializations. 
                Lead pricing is based on project budget—you only pay when you unlock leads.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400">
                  <span className="font-medium">📋 Non-Exclusive:</span>
                  <span>$10-$49/lead</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  <span className="font-medium">⭐ Exclusive:</span>
                  <span>$50-$249/lead</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {profiles.length === 0 ? (
        <Card className="border-dashed border-2 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Briefcase className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Profiles Yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Create your first profile to start receiving leads and growing your business on Digs & Gigs.
            </p>
            <Button onClick={handleCreateNewProfile} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Your First Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Card className="text-center p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold text-primary">{profiles.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Active Profiles</p>
            </Card>
            <Card className="text-center p-4 bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-2xl font-bold text-accent">
                  {profiles.reduce((sum, p) => sum + (p.total_bids || 0), 0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Total Bids</p>
            </Card>
            <Card className="text-center p-4 bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  {profiles.reduce((sum, p) => sum + (p.active_leads || 0), 0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </Card>
          </div>

          {/* Profile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile, index) => (
              <Card 
                key={profile.id} 
                className="relative overflow-hidden hover-lift cursor-pointer group border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                onClick={() => navigate(`/digger/${profile.id}`)}
              >
                {/* Primary Badge */}
                {profile.is_primary && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-primary text-primary-foreground gap-1 shadow-md">
                      <Star className="h-3 w-3 fill-current" />
                      Primary
                    </Badge>
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <CardHeader className="relative pb-2">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {profile.profile_image_url ? (
                      <img 
                        src={profile.profile_image_url} 
                        alt={getProfileDisplayName(profile)} 
                        className="w-16 h-16 rounded-xl object-cover border-2 border-border shadow-sm" 
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-border">
                        <span className="text-2xl font-bold text-primary">
                          {getProfileDisplayName(profile)[0]}
                        </span>
                      </div>
                    )}
                    
                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate mb-1">{getProfileDisplayName(profile)}</CardTitle>
                      <CardDescription className="truncate flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" />
                        {profile.profession || "No profession set"}
                      </CardDescription>
                      <div className="mt-2">
                        <Badge variant={getTierBadgeVariant(profile.subscription_tier)} className="capitalize">
                          {profile.subscription_tier || "free"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 py-4 border-y border-border/50 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary">{profile.total_bids}</div>
                      <div className="text-xs text-muted-foreground">Bids</div>
                    </div>
                    <div className="text-center border-x border-border/50">
                      <div className="text-xl font-bold text-accent">{profile.active_leads}</div>
                      <div className="text-xs text-muted-foreground">Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-foreground flex items-center justify-center gap-1">
                        {profile.average_rating?.toFixed(1) || "—"}
                        {profile.average_rating && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                      </div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate(`/edit-digger-profile?profileId=${profile.id}`)} 
                      className="flex-1 gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {!profile.is_primary && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSetPrimary(profile.id)} 
                        title="Set as primary"
                        className="hover:bg-primary/10 hover:border-primary/30"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDeleteDialog({ open: true, profileId: profile.id })} 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30" 
                      title="Delete profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, profileId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this profile? This action cannot be undone. 
              All associated bids and data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Welcome modal after registration */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Welcome to Digs & Gigs!</DialogTitle>
            <DialogDescription className="text-center text-base">
              Please complete your profile to get the most out of the platform. Add your photo, services, and details to attract clients and stand out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => { setShowWelcomeModal(false); navigate('/edit-digger-profile'); }} className="w-full sm:w-auto">
              Complete My Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setShowWelcomeModal(false)} className="w-full sm:w-auto">
              I&apos;ll do it later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
