import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { LocationSelector, type LocationValue } from "@/components/LocationSelector";
import { useRegionsByCountry } from "@/hooks/useLocations";
import { getHandleForFirstProfile } from "@/lib/generateHandle";
import { ensureProfileFromAuth } from "@/lib/ensureProfileFromAuth";
import { ensureGiggerProfile } from "@/lib/ensureGiggerProfile";
import { supabase } from "@/integrations/supabase/client";

const ROLE_CONFIG: Record<
  "digger" | "gigger",
  {
    iconClass: string;
    buttonClass: string;
    title: string;
    description: string;
    profileLabel: string;
    profilePlaceholder: string;
    profileHint: string;
    locationLabel: string;
    locationHint: string;
    locationLockedHint: string;
    submitLabel: string;
    submitLoadingLabel: string;
  }
> = {
  digger: {
    iconClass: "text-primary",
    buttonClass: "",
    title: "Create Your Digger Profile",
    description: "Headline and your location. You can add more later.",
    profileLabel: "Professional Headline",
    profilePlaceholder: "e.g., Full Stack Development, DevOps Consulting",
    profileHint: "Short headline so clients can find you.",
    locationLabel: "Location",
    locationHint: "Your location.",
    locationLockedHint: "Your location was set when you registered as Gigger. One user, one location.",
    submitLabel: "Create Profile & Continue",
    submitLoadingLabel: "Creating profile...",
  },
  gigger: {
    iconClass: "text-emerald-600 dark:text-emerald-400",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
    title: "Create Your Gigger Profile",
    description: "Profile title and your location.",
    profileLabel: "Profile Title",
    profilePlaceholder: "e.g., Acme Co., Marketing Team, Sarah's Studio",
    profileHint: "How you'll appear when you post gigs.",
    locationLabel: "Location",
    locationHint: "Your location.",
    locationLockedHint: "Your location was set when you registered as Digger. One user, one location.",
    submitLabel: "Continue",
    submitLoadingLabel: "Saving...",
  },
};

const emptyLocation: LocationValue = {
  countryId: null,
  regionId: null,
  cityId: null,
  countryName: "",
  regionName: "",
  cityName: "",
  countryCode: "",
};

export interface FirstProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "digger" | "gigger";
  user: User | null;
  onSuccess?: () => void;
}

export function FirstProfileDialog({
  open,
  onOpenChange,
  role,
  user,
  onSuccess,
}: FirstProfileDialogProps) {
  const [profileTitle, setProfileTitle] = useState("");
  const [locationValue, setLocationValue] = useState<LocationValue>(emptyLocation);
  const [locationLocked, setLocationLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: regions = [] } = useRegionsByCountry(locationValue.countryId, "");
  const regionRequired = regions.length > 0;
  const canSubmit =
    profileTitle.trim().length >= 2 &&
    !!locationValue.countryName &&
    (!regionRequired || !!locationValue.regionName);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setProfileTitle("");
      setLocationValue(emptyLocation);
      setLocationLocked(false);
    }
  }, [open, role]);

  // Pre-fill location when dialog opens
  useEffect(() => {
    if (!user || !open) return;
    const load = async () => {
      try {
        if (role === "gigger") {
          const { data: profile } = await (supabase.from("profiles") as any)
            .select("profile_title, country, state")
            .eq("id", user.id)
            .single();
          if (profile?.profile_title) setProfileTitle(profile.profile_title);
          const { data: diggerLoc } = await supabase
            .from("digger_profiles")
            .select("country, state")
            .eq("user_id", user.id)
            .not("country", "is", null)
            .limit(1)
            .maybeSingle();
          if (diggerLoc?.country) {
            setLocationValue((prev) => ({ ...prev, countryName: diggerLoc.country, regionName: diggerLoc.state || prev.regionName }));
            setLocationLocked(true);
          } else if (profile?.country) {
            setLocationValue((prev) => ({ ...prev, countryName: profile.country, regionName: profile.state || prev.regionName }));
          }
        } else {
          const { data } = await (supabase.from("profiles") as any)
            .select("country, state")
            .eq("id", user.id)
            .single();
          if (data?.country) {
            setLocationValue((prev) => ({ ...prev, countryName: data.country, regionName: data.state || prev.regionName }));
            setLocationLocked(true);
          }
        }
      } catch {
        /* ignore */
      }
    };
    void load();
  }, [user?.id, role, open]);

  const handleDiggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setIsSubmitting(true);
    try {
      const { error: profileError } = await ensureProfileFromAuth(user);
      if (profileError) {
        toast.error("Account setup incomplete. Please refresh and try again.");
        setIsSubmitting(false);
        return;
      }
      const { data: existingProfiles, error: existingProfilesError } = await supabase
        .from("digger_profiles")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (existingProfilesError || (existingProfiles?.length ?? 0) >= 1) {
        if ((existingProfiles?.length ?? 0) >= 1) toast.error("You can only have one Digger profile.");
        else toast.error("Failed to validate existing profiles. Please try again.");
        setIsSubmitting(false);
        return;
      }
      const countryVal = locationValue.countryName || null;
      const stateVal = locationValue.regionName || null;
      const cityVal = locationValue.cityName || null;
      const locationParts = [cityVal, stateVal, countryVal].filter(Boolean);
      const locationString = locationParts.length > 0 ? locationParts.join(", ") : "Not specified";
      let userPhone = "Not specified";
      let fullName: string | null = null;
      try {
        const { data: profile } = await supabase.from("profiles").select("phone, full_name").eq("id", user.id).single();
        if (profile?.phone) userPhone = profile.phone;
        if (profile?.full_name) fullName = profile.full_name;
      } catch {
        /* ignore */
      }
      if (!fullName && user.user_metadata?.full_name) fullName = user.user_metadata.full_name;
      const { data: existingHandles } = await supabase.from("digger_profiles").select("handle").not("handle", "is", null);
      const handle = getHandleForFirstProfile(fullName, (existingHandles || []).map((r) => r.handle).filter(Boolean) as string[]);
      const { data: newProfile, error: createError } = await supabase
        .from("digger_profiles")
        .insert({
          user_id: user.id,
          handle,
          business_name: profileTitle.trim(),
          profile_name: profileTitle.trim(),
          profession: "General Services",
          location: locationString,
          country: countryVal,
          state: stateVal,
          city: locationValue.cityName || null,
          country_id: locationValue.countryId || null,
          region_id: locationValue.regionId || null,
          city_id: locationValue.cityId || null,
          phone: userPhone,
          keywords: [],
          registration_status: "incomplete",
          subscription_tier: "free",
          subscription_status: "inactive",
          is_primary: true,
          allow_gigger_contact: false,
        })
        .select("id")
        .single();
      if (createError) {
        toast.error(createError.message || "Failed to create profile. Please try again.");
        setIsSubmitting(false);
        return;
      }
      toast.success("Profile created! Complete your profile to attract more clients.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleGiggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setIsSubmitting(true);
    try {
      await ensureGiggerProfile(user.id);
      await (supabase.from("profiles") as any)
        .update({
          profile_title: profileTitle.trim(),
          country: locationValue.countryName || null,
          state: locationValue.regionName || null,
          city: locationValue.cityName || null,
          country_id: locationValue.countryId || null,
          region_id: locationValue.regionId || null,
          city_id: locationValue.cityId || null,
        })
        .eq("id", user.id);
      toast.success("Profile set up. You can post gigs and hire professionals.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!user) return null;
  const cfg = ROLE_CONFIG[role];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{cfg.title}</DialogTitle>
          <DialogDescription className="text-sm">{cfg.description}</DialogDescription>
        </DialogHeader>
        {role === "digger" ? (
          <form onSubmit={handleDiggerSubmit} className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dialog-profile-title" className="flex items-center gap-2 text-sm">
                <Briefcase className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                {cfg.profileLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dialog-profile-title"
                value={profileTitle}
                onChange={(e) => setProfileTitle(e.target.value)}
                placeholder={cfg.profilePlaceholder}
                minLength={2}
                maxLength={100}
                required
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">{cfg.profileHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                {cfg.locationLabel} <span className="text-destructive">*</span>
                {locationLocked && (
                  <span className="text-xs text-muted-foreground font-normal">(from your Gigger profile)</span>
                )}
              </Label>
              <p className="text-xs text-muted-foreground">{locationLocked ? cfg.locationLockedHint : cfg.locationHint}</p>
              <LocationSelector
                value={locationValue}
                onChange={setLocationValue}
                disabled={locationLocked}
                regionLabel="State / Territory"
              />
            </div>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`w-full h-10 ${cfg.buttonClass}`}
            >
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {cfg.submitLoadingLabel}</> : cfg.submitLabel}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleGiggerSubmit} className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dialog-gigger-profile-title" className="flex items-center gap-2 text-sm">
                <Briefcase className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                {cfg.profileLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dialog-gigger-profile-title"
                value={profileTitle}
                onChange={(e) => setProfileTitle(e.target.value)}
                placeholder={cfg.profilePlaceholder}
                minLength={2}
                maxLength={100}
                required
                className="h-10 placeholder:text-muted-foreground/70"
              />
              <p className="text-xs text-muted-foreground">{cfg.profileHint}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                {cfg.locationLabel} <span className="text-destructive">*</span>
                {locationLocked && (
                  <span className="text-xs text-muted-foreground font-normal">(from your Digger profile)</span>
                )}
              </Label>
              <p className="text-xs text-muted-foreground">{locationLocked ? cfg.locationLockedHint : cfg.locationHint}</p>
              <LocationSelector
                value={locationValue}
                onChange={setLocationValue}
                disabled={locationLocked}
                regionLabel="State / Territory"
              />
            </div>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`w-full h-10 ${cfg.buttonClass}`}
            >
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {cfg.submitLoadingLabel}</> : cfg.submitLabel}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
