import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronDown, User, Edit, Star, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DiggerProfile {
  id: string;
  profile_name: string | null;
  business_name: string;
  is_primary: boolean;
}

export const DiggerProfileSelector = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profiles, setProfiles] = useState<DiggerProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<DiggerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [createProfileDialog, setCreateProfileDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Extract profile ID from URL path or query params
  const getProfileIdFromUrl = useCallback((): string | null => {
    // First check path (e.g., /digger/:id)
    const match = location.pathname.match(/\/digger\/([^/]+)/);
    if (match) return match[1];
    
    // Then check query params (e.g., ?profileId=xxx)
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('profileId');
  }, [location.pathname, location.search]);

  const loadProfiles = useCallback(async () => {
    if (!user) {
      console.log("DiggerProfileSelector: No user, skipping load");
      setLoading(false);
      return;
    }

    // Don't load if in sign-in OTP flow
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    if (isInOtpFlow) {
      console.log("DiggerProfileSelector: In OTP flow, skipping load");
      setLoading(false);
      return;
    }

    console.log("DiggerProfileSelector: Loading profiles for user:", user.id);

    try {
      // First check if user has digger role - if not, skip query entirely
      // Use RPC function to bypass RLS and avoid 500 errors
      let hasDiggerRole = false;
      try {
        const { data: hasRole, error: roleError } = await supabase
          .rpc('has_app_role', { 
            _user_id: user.id, 
            _role: 'digger' 
          });
        
        if (!roleError && hasRole === true) {
          hasDiggerRole = true;
        } else if (roleError) {
          console.warn("DiggerProfileSelector: Error checking digger role (non-fatal):", roleError);
          // On error, assume user doesn't have role to be safe
          hasDiggerRole = false;
        }
      } catch (rpcException) {
        console.warn("DiggerProfileSelector: RPC function not available, assuming no digger role:", rpcException);
        hasDiggerRole = false;
      }

      if (!hasDiggerRole) {
        // User doesn't have digger role, no need to query profiles
        console.log("DiggerProfileSelector: User doesn't have digger role, skipping profile load");
        setProfiles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("digger_profiles")
        .select("id, profile_name, business_name, is_primary")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        // Handle 406 error gracefully - might be RLS policy issue
        if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          console.warn("DiggerProfileSelector: Query blocked by RLS or header issue, user may not have digger profile yet:", error);
          setProfiles([]);
          setLoading(false);
          return;
        }
        console.error("DiggerProfileSelector: Error loading profiles:", error);
        // Don't throw - just set empty profiles
        setProfiles([]);
        setLoading(false);
        return;
      }

      console.log("DiggerProfileSelector: Loaded profiles:", data);

      if (data && data.length > 0) {
        setProfiles(data);
        
        // Check if we're on a specific profile page first
        const urlProfileId = getProfileIdFromUrl();
        console.log("DiggerProfileSelector: URL profile ID:", urlProfileId);
        
        if (urlProfileId) {
          const matchingProfile = data.find(p => p.id === urlProfileId);
          if (matchingProfile) {
            console.log("DiggerProfileSelector: Setting current profile from URL:", matchingProfile);
            setCurrentProfile(matchingProfile);
          } else {
            // Fallback to primary or first
            const primary = data.find(p => p.is_primary) || data[0];
            console.log("DiggerProfileSelector: URL profile not found, using primary:", primary);
            setCurrentProfile(primary);
          }
        } else {
          // Set current profile to primary or first one
          const primary = data.find(p => p.is_primary) || data[0];
          console.log("DiggerProfileSelector: No URL profile, using primary:", primary);
          setCurrentProfile(primary);
        }
      } else {
        console.log("DiggerProfileSelector: No profiles found for user");
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [user, getProfileIdFromUrl]);

  useEffect(() => {
    // Only load profiles if user is authenticated and not in sign-in OTP flow
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    if (user && !isInOtpFlow) {
      loadProfiles();
    } else {
      setLoading(false);
    }
  }, [user, loadProfiles]);

  // Update current profile when URL changes
  useEffect(() => {
    const urlProfileId = getProfileIdFromUrl();
    if (urlProfileId && profiles.length > 0) {
      const matchingProfile = profiles.find(p => p.id === urlProfileId);
      if (matchingProfile) {
        setCurrentProfile(matchingProfile);
      }
    }
  }, [location.pathname, profiles, getProfileIdFromUrl]);

  const handleCreateProfile = () => {
    setNewProfileName('');
    setCreateProfileDialog(true);
  };

  const handleConfirmCreateProfile = () => {
    if (!newProfileName.trim()) {
      toast.error("Please enter a profile name");
      return;
    }
    // Store the profile name in sessionStorage for the category browser to use
    sessionStorage.setItem('newProfileName', newProfileName.trim());
    setCreateProfileDialog(false);
    navigate("/profile-categories");
  };

  const handleEditProfile = (profileId: string) => {
    navigate(`/edit-digger-profile?profileId=${profileId}`);
  };

  const handleViewProfile = (profileId: string) => {
    // Immediately update current profile before navigating
    const selectedProfile = profiles.find(p => p.id === profileId);
    if (selectedProfile) {
      setCurrentProfile(selectedProfile);
    }
    navigate(`/digger/${profileId}`);
  };

  if (loading || profiles.length === 0) {
    return null;
  }

  const getProfileDisplayName = (profile: DiggerProfile) => {
    return profile.profile_name || profile.business_name;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="max-w-[150px] truncate">
            {currentProfile ? getProfileDisplayName(currentProfile) : "My Profiles"}
          </span>
          {currentProfile?.is_primary && (
            <Star className="h-3 w-3 fill-primary text-primary" />
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>My Profiles</span>
          <Badge variant="secondary">{profiles.length}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {profiles.map((profile) => (
          <div key={profile.id} className="flex items-center gap-2 px-2 py-1">
            <DropdownMenuItem
              onClick={() => handleViewProfile(profile.id)}
              className="flex-1 cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <User className="h-4 w-4" />
                <span className="flex-1 truncate">{getProfileDisplayName(profile)}</span>
                {profile.is_primary && (
                  <Star className="h-3 w-3 fill-primary text-primary" />
                )}
              </div>
            </DropdownMenuItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEditProfile(profile.id);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => navigate("/my-profiles")}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage All Profiles
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleCreateProfile}
          className="cursor-pointer text-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Profile
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>

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
              <Label htmlFor="selector-new-profile-name">
                Profile Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="selector-new-profile-name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
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
            <Button onClick={handleConfirmCreateProfile} disabled={!newProfileName.trim()}>
              Continue to Browse Categories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
};
