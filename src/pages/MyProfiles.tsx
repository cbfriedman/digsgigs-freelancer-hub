import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Star, Edit, Trash2, Eye, Award, MessageSquare, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import { retryWithBackoff } from "@/utils/retryWithBackoff";

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
const [renameDialog, setRenameDialog] = useState<{ open: boolean; profileId: string | null; currentName: string }>({
    open: false,
    profileId: null,
    currentName: '',
  });
  const [newProfileName, setNewProfileName] = useState('');
  const [createProfileDialog, setCreateProfileDialog] = useState(false);
  const [newProfileNameForCreate, setNewProfileNameForCreate] = useState('');

  const handleCreateNewProfile = () => {
    setNewProfileNameForCreate('');
    setCreateProfileDialog(true);
  };

  const handleConfirmCreateProfile = () => {
    if (!newProfileNameForCreate.trim()) {
      toast.error("Please enter a profile name");
      return;
    }
    // Store the profile name in sessionStorage for the category browser to use
    sessionStorage.setItem('newProfileName', newProfileNameForCreate.trim());
    setCreateProfileDialog(false);
    navigate("/pricing");
  };

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;

    try {
      console.log("Loading profiles for user:", user.id);
      const { data: profilesData, error } = await retryWithBackoff(
        async () => {
          const result = await supabase
            .from("digger_profiles")
            .select("*")
            .eq("user_id", user.id)
            .order("is_primary", { ascending: false })
            .order("created_at", { ascending: true });
          
          if (result.error) throw result.error;
          return result;
        },
        { maxAttempts: 3, initialDelay: 1000 }
      );

      if (error) throw error;

      console.log("Profiles loaded:", profilesData);
      if (profilesData) {
        // Fetch stats for each profile with retry logic
        const profilesWithStats = await Promise.all(
          profilesData.map(async (profile) => {
            try {
              const [bidsResult, leadsResult] = await Promise.all([
                retryWithBackoff(
                  async () => {
                    const result = await supabase.from("bids").select("*", { count: "exact", head: true }).eq("digger_id", profile.id);
                    return result;
                  },
                  { maxAttempts: 2, initialDelay: 500 }
                ),
                retryWithBackoff(
                  async () => {
                    const result = await supabase.from("lead_purchases").select("*", { count: "exact", head: true }).eq("digger_id", profile.id).eq("status", "completed");
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

        console.log("Profiles with stats:", profilesWithStats);
        setProfiles(profilesWithStats);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast.error("Failed to load profiles. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (profileId: string) => {
    if (!user) return;

    try {
      await retryWithBackoff(async () => {
        // First, set all profiles to non-primary
        await supabase.from("digger_profiles").update({ is_primary: false }).eq("user_id", user.id);

        // Then set the selected profile as primary
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

  const handleRename = async () => {
    if (!renameDialog.profileId || !newProfileName.trim()) return;

    try {
      await retryWithBackoff(async () => {
        const { error } = await supabase
          .from("digger_profiles")
          .update({ profile_name: newProfileName.trim() })
          .eq("id", renameDialog.profileId);
        if (error) throw error;
      });

      toast.success("Profile renamed successfully");
      setRenameDialog({ open: false, profileId: null, currentName: '' });
      setNewProfileName('');
      loadProfiles();
    } catch (error) {
      console.error("Error renaming profile:", error);
      toast.error("Failed to rename profile - please check your connection");
    }
  };

  const getProfileDisplayName = (profile: ProfileWithStats) => {
    if (profile.profile_name) return profile.profile_name;
    if (profile.business_name) return profile.business_name;
    if (profile.profession) return profile.profession;
    return "Unnamed Profile";
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
          <Button onClick={handleCreateNewProfile} className="gap-2">
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
              <Button onClick={handleCreateNewProfile}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Found {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <Card 
                key={profile.id} 
                className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/edit-digger-profile?profileId=${profile.id}`)}
              >
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

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/digger/${profile.id}`)} className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setRenameDialog({ 
                          open: true, 
                          profileId: profile.id, 
                          currentName: getProfileDisplayName(profile) 
                        });
                        setNewProfileName(getProfileDisplayName(profile));
                      }} 
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Rename
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
          </>
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

      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ open, profileId: null, currentName: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Profile</DialogTitle>
            <DialogDescription>Enter a new name for this profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Enter profile name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ open: false, profileId: null, currentName: '' })}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newProfileName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Profile Dialog */}
      <Dialog open={createProfileDialog} onOpenChange={setCreateProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
            <DialogDescription>
              Enter a name for your new profile. This helps you identify different service offerings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-profile-name">
                Profile Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-profile-name"
                value={newProfileNameForCreate}
                onChange={(e) => setNewProfileNameForCreate(e.target.value)}
                placeholder="e.g., Plumbing Services, Legal Consulting"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Examples: "Commercial Electrical", "Residential Plumbing", "Tax Services"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateProfileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreateProfile} disabled={!newProfileNameForCreate.trim()}>
              Continue to Browse Categories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
