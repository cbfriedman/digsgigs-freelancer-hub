import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown, User, Edit, Star, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiggerProfile {
  id: string;
  profile_name: string | null;
  business_name: string;
  is_primary: boolean;
}

export const DiggerProfileSelector = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiggerProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<DiggerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("digger_profiles")
        .select("id, profile_name, business_name, is_primary")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setProfiles(data);
        // Set current profile to primary or first one
        const primary = data.find(p => p.is_primary) || data[0];
        setCurrentProfile(primary);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = () => {
    navigate("/digger-registration");
  };

  const handleEditProfile = (profileId: string) => {
    navigate(`/edit-digger-profile?profileId=${profileId}`);
  };

  const handleViewProfile = (profileId: string) => {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
