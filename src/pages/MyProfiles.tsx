import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Star, Edit, Trash2, Eye, Award, MessageSquare } from "lucide-react";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; profileId: string | null }>({
    open: false,
    profileId: null,
  });

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;

    try {
      const { data: profilesData, error } = await supabase
        .from("digger_profiles")
        .select("id, profile_name, business_name, profession, is_primary, average_rating, total_ratings, profile_image_url, subscription_tier, created_at")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (profilesData) {
        // Fetch stats for each profile
        const profilesWithStats = await Promise.all(
          profilesData.map(async (profile) => {
            try {
              const [{ count: bidsCount }, { count: leadsCount }] = await Promise.all([
                supabase.from("bids").select("*", { count: "exact", head: true }).eq("digger_id", profile.id),
                supabase.from("lead_purchases").select("*", { count: "exact", head: true }).eq("digger_id", profile.id).eq("status", "completed"),
              ]);

              return {
                ...profile,
                total_bids: bidsCount || 0,
                active_leads: leadsCount || 0,
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
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (profileId: string) => {
    if (!user) return;

    try {
      // First, set all profiles to non-primary
      await supabase.from("digger_profiles").update({ is_primary: false }).eq("user_id", user.id);

      // Then set the selected profile as primary
      const { error } = await supabase.from("digger_profiles").update({ is_primary: true }).eq("id", profileId);

      if (error) throw error;

      toast.success("Primary profile updated");
      loadProfiles();
    } catch (error) {
      console.error("Error setting primary profile:", error);
      toast.error("Failed to set primary profile");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.profileId) return;

    try {
      const { error } = await supabase.from("digger_profiles").delete().eq("id", deleteDialog.profileId);

      if (error) throw error;

      toast.success("Profile deleted successfully");
      setDeleteDialog({ open: false, profileId: null });
      loadProfiles();
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error("Failed to delete profile");
    }
  };

  const getProfileDisplayName = (profile: ProfileWithStats) => {
    return profile.profile_name || profile.business_name;
  };

  const getTierBadgeVariant = (tier: string | null) => {
    switch (tier) {
      case "premium":
        return "default";
      case "pro":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Profiles</h1>
            <p className="text-muted-foreground">Manage your digger profiles and view statistics</p>
          </div>
          <Button onClick={() => navigate("/digger-registration")} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Profile
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="space-y-2">
                <h3 className="font-semibold">Why Multiple Profiles?</h3>
                <p className="text-sm text-muted-foreground">
                  If you offer services in different pricing categories (e.g., Legal Services + Cleaning), create separate profiles for each. 
                  This ensures you only pay the appropriate lead cost for each industry rather than the highest rate across all your services.
                </p>
                <div className="flex gap-4 text-xs mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">💼 Low-Value:</span>
                    <span className="font-medium">$8-24/lead</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600">🏗️ Mid-Value:</span>
                    <span className="font-medium">$40-120/lead</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-600">⭐ High-Value:</span>
                    <span className="font-medium">$250-750/lead</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {profiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">You don't have any profiles yet</p>
              <Button onClick={() => navigate("/digger-registration")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <Card key={profile.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                {profile.is_primary && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-lg">
                    <Star className="h-3 w-3 inline mr-1" />
                    Primary
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start gap-4 mb-2">
                    {profile.profile_image_url ? (
                      <img src={profile.profile_image_url} alt={getProfileDisplayName(profile)} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-2xl font-bold text-muted-foreground">{getProfileDisplayName(profile)[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{getProfileDisplayName(profile)}</CardTitle>
                      <CardDescription className="truncate">{profile.profession}</CardDescription>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant={getTierBadgeVariant(profile.subscription_tier)}>{profile.subscription_tier || "free"}</Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{profile.total_bids}</div>
                      <div className="text-xs text-muted-foreground">Bids</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{profile.active_leads}</div>
                      <div className="text-xs text-muted-foreground">Leads</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{profile.average_rating?.toFixed(1) || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/digger/${profile.id}`)} className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/edit-digger-profile?profileId=${profile.id}`)} className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {!profile.is_primary && (
                      <Button variant="outline" size="sm" onClick={() => handleSetPrimary(profile.id)} title="Set as primary">
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setDeleteDialog({ open: true, profileId: profile.id })} className="text-destructive hover:text-destructive" title="Delete profile">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, profileId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this profile? This action cannot be undone. All associated bids and data will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
