import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { LocationSelector, type LocationValue } from "@/components/LocationSelector";
import { useRegionsByCountry } from "@/hooks/useLocations";
import { goToEditProfile } from "@/lib/profileWorkspaceRoute";
import { getHandleForFirstProfile } from "@/lib/generateHandle";
import { ensureProfileFromAuth } from "@/lib/ensureProfileFromAuth";
import { ensureGiggerProfile } from "@/lib/ensureGiggerProfile";
import { PageLayout } from "@/components/layout/PageLayout";


type SetupMode = "digger" | "gigger" | null;

/** Role-specific theme and copy — minimal for both Digger and Gigger */
const ROLE_CONFIG: Record<
  "digger" | "gigger",
  {
    cardClass: string;
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
    footerHint: string;
  }
> = {
  digger: {
    cardClass: "border-l-4 border-l-primary shadow-sm",
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
    footerHint: "",
  },
  gigger: {
    cardClass: "border-l-4 border-l-emerald-500/80 dark:border-l-emerald-400/60 shadow-sm",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
    title: "Create Your Gigger Profile",
    description: "Profile title and your location.",
    profileLabel: "Profile Title",
    profilePlaceholder: "e.g., Acme Co., Marketing Team, Sarah’s Studio",
    profileHint: "How you’ll appear when you post gigs.",
    locationLabel: "Location",
    locationHint: "Your location.",
    locationLockedHint: "Your location was set when you registered as Digger. One user, one location.",
    submitLabel: "Continue",
    submitLoadingLabel: "Saving...",
    footerHint: "",
  },
};

export default function FirstProfileCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromRegistration = (location.state as { fromRegistration?: boolean })?.fromRegistration === true;
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>(null);
  const [hasDiggerProfile, setHasDiggerProfile] = useState(false);
  const [diggerCompleted, setDiggerCompleted] = useState(false);

  const emptyLocation: LocationValue = {
    countryId: null,
    regionId: null,
    cityId: null,
    countryName: "",
    regionName: "",
    cityName: "",
    countryCode: "",
  };

  // Digger form state
  const [profileTitle, setProfileTitle] = useState("");
  const [locationValue, setLocationValue] = useState<LocationValue>(emptyLocation);
  const [locationLocked, setLocationLocked] = useState(false);

  // Gigger form state (separate so we don't overwrite when switching)
  const [giggerProfileTitle, setGiggerProfileTitle] = useState("");
  const [giggerLocationValue, setGiggerLocationValue] = useState<LocationValue>(emptyLocation);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: diggerRegions = [] } = useRegionsByCountry(locationValue.countryId, "");
  const { data: giggerRegions = [] } = useRegionsByCountry(giggerLocationValue.countryId, "");
  const diggerRegionRequired = diggerRegions.length > 0;
  const giggerRegionRequired = giggerRegions.length > 0;
  const diggerCanSubmit =
    profileTitle.trim().length >= 2 &&
    !!locationValue.countryName &&
    (!diggerRegionRequired || !!locationValue.regionName);
  const giggerCanSubmit =
    giggerProfileTitle.trim().length >= 2 &&
    !!giggerLocationValue.countryName &&
    (!giggerRegionRequired || !!giggerLocationValue.regionName);

  useEffect(() => {
    if (!user) {
      navigate("/register", { replace: true });
      return;
    }
  }, [user, navigate]);

  // Determine roles and what to show: Digger form, Gigger form, or redirect
  useEffect(() => {
    if (!user) return;
    const resolve = async () => {
      try {
        // When coming from Register, roles were just inserted — retry a few times
        const maxAttempts = fromRegistration ? 5 : 1;
        const delayMs = 400;
        let roleList: { app_role: string }[] = [];

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const { data: roles } = await (supabase.rpc as any)("get_user_app_roles_safe", { _user_id: user.id });
          roleList = Array.isArray(roles) ? roles : [];
          if (roleList.length > 0) break;
          if (attempt < maxAttempts - 1) await new Promise((r) => setTimeout(r, delayMs));
        }

        const hasDigger = roleList.some((r: { app_role: string }) => r.app_role === "digger");
        const hasGigger = roleList.some((r: { app_role: string }) => r.app_role === "gigger");

        if (!hasDigger && !hasGigger) {
          navigate("/register?complete=true", { replace: true });
          setRolesLoaded(true);
          return;
        }

        let diggerProfileExists = false;
        if (hasDigger) {
          const { data: dp } = await supabase.from("digger_profiles").select("id").eq("user_id", user.id).limit(1).maybeSingle();
          diggerProfileExists = !!dp?.id;
        }
        setHasDiggerProfile(diggerProfileExists);

        let giggerProfileComplete = false;
        if (hasGigger) {
          const [{ data: gp }, { data: profileRow }] = await Promise.all([
            (supabase.from("gigger_profiles" as any)).select("user_id").eq("user_id", user.id).limit(1).maybeSingle(),
            (supabase.from("profiles") as any).select("profile_title").eq("id", user.id).single(),
          ]);
          const hasGiggerRow = !!(gp as any)?.user_id;
          const hasProfileTitle = !!((profileRow as { profile_title?: string } | null)?.profile_title?.trim());
          giggerProfileComplete = hasGiggerRow && hasProfileTitle;
        }

        const needDiggerSetup = hasDigger && !diggerProfileExists;
        const needGiggerSetup = hasGigger && !giggerProfileComplete;

        // Show Digger first if needed, then Gigger only if needed; otherwise go to dashboard
        if (needDiggerSetup && !diggerCompleted) {
          setSetupMode("digger");
        } else if (needGiggerSetup) {
          setSetupMode("gigger");
        } else {
          navigate("/role-dashboard", { replace: true });
          return;
        }
      } catch {
        navigate("/register?complete=true", { replace: true });
      } finally {
        setRolesLoaded(true);
      }
    };
    void resolve();
  }, [user, navigate, diggerCompleted, fromRegistration]);

  // Pre-fill Gigger form from profiles and/or Digger location (one user = one location)
  useEffect(() => {
    if (!user || setupMode !== "gigger") return;
    const load = async () => {
      try {
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("profile_title, country, state")
          .eq("id", user.id)
          .single();
        if (profile?.profile_title) setGiggerProfileTitle(profile.profile_title);
        const { data: diggerLoc } = await supabase
          .from("digger_profiles")
          .select("country, state")
          .eq("user_id", user.id)
          .not("country", "is", null)
          .limit(1)
          .maybeSingle();
        if (diggerLoc?.country) {
          setGiggerLocationValue((prev) => ({ ...prev, countryName: diggerLoc.country }));
          if (diggerLoc.state) setGiggerLocationValue((prev) => ({ ...prev, regionName: diggerLoc.state }));
          setLocationLocked(true);
        } else if (profile?.country) {
          setGiggerLocationValue((prev) => ({ ...prev, countryName: profile.country }));
          if (profile.state) setGiggerLocationValue((prev) => ({ ...prev, regionName: profile.state }));
        }
      } catch {
        /* ignore */
      }
    };
    void load();
  }, [user?.id, setupMode]);

  // Pre-fill Digger form location from profiles (Gigger first)
  useEffect(() => {
    if (!user || setupMode !== "digger") return;
    const load = async () => {
      try {
        const { data } = await (supabase.from("profiles") as any)
          .select("country, state")
          .eq("id", user.id)
          .single();
        if (data?.country) {
          setLocationValue((prev) => ({ ...prev, countryName: data.country }));
          if (data.state) setLocationValue((prev) => ({ ...prev, regionName: data.state }));
          setLocationLocked(true);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
  }, [user?.id, setupMode]);

  const handleDiggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !diggerCanSubmit) return;

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
      const { data: rolesAfter } = await (supabase.rpc as any)("get_user_app_roles_safe", { _user_id: user.id });
      const hasGigger = Array.isArray(rolesAfter) && rolesAfter.some((r: { app_role: string }) => r.app_role === "gigger");
      const { data: gp } = await (supabase.from("gigger_profiles" as any)).select("user_id").eq("user_id", user.id).limit(1).maybeSingle();
      const needGiggerSetup = hasGigger && !(gp as any)?.user_id;
      if (needGiggerSetup) {
        setDiggerCompleted(true);
        setHasDiggerProfile(true);
        setSetupMode("gigger");
      } else {
        goToEditProfile(navigate, newProfile.id, { replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleGiggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !giggerCanSubmit) return;

    setIsSubmitting(true);
    try {
      await ensureGiggerProfile(user.id);
      const updates: Record<string, unknown> = {
        profile_title: giggerProfileTitle.trim(),
        country: giggerLocationValue.countryName || null,
        state: giggerLocationValue.regionName || null,
        city: giggerLocationValue.cityName || null,
        country_id: giggerLocationValue.countryId || null,
        region_id: giggerLocationValue.regionId || null,
        city_id: giggerLocationValue.cityId || null,
      };
      await (supabase.from("profiles") as any).update(updates).eq("id", user.id);
      toast.success("Profile set up. You can post gigs and hire professionals.");
      navigate("/role-dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!rolesLoaded || !setupMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const cfg = setupMode ? ROLE_CONFIG[setupMode] : null;

  return (
    <PageLayout>
      <div className="max-w-md mx-auto py-6 px-4">
        {cfg && (
          <Card className={cfg.cardClass}>
            <CardHeader className="pb-3 pt-6 px-6">
              <CardTitle className="text-lg font-medium">{cfg.title}</CardTitle>
              <CardDescription className="text-sm">{cfg.description}</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              {setupMode === "digger" && (
                <form onSubmit={handleDiggerSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-title" className="flex items-center gap-2 text-sm">
                      <Briefcase className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                      {cfg.profileLabel} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="profile-title"
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
                        <span className="text-xs text-muted-foreground font-normal">
                          ({setupMode === "digger" ? "from your Gigger profile" : "from your Digger profile"})
                        </span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {locationLocked ? cfg.locationLockedHint : cfg.locationHint}
                    </p>
                    <LocationSelector
                      value={locationValue}
                      onChange={setLocationValue}
                      disabled={locationLocked}
                      regionLabel="State / Territory"
                    />
                  </div>

                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={!diggerCanSubmit || isSubmitting}
                      className={`w-full h-10 ${cfg.buttonClass}`}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {cfg.submitLoadingLabel}</>
                      ) : (
                        cfg.submitLabel
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {setupMode === "gigger" && (
                <form onSubmit={handleGiggerSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="gigger-profile-title" className="flex items-center gap-2 text-sm">
                      <Briefcase className={`h-3.5 w-3.5 ${cfg.iconClass}`} />
                      {cfg.profileLabel} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="gigger-profile-title"
                      value={giggerProfileTitle}
                      onChange={(e) => setGiggerProfileTitle(e.target.value)}
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
                    <p className="text-xs text-muted-foreground">
                      {locationLocked ? cfg.locationLockedHint : cfg.locationHint}
                    </p>
                    <LocationSelector
                      value={giggerLocationValue}
                      onChange={setGiggerLocationValue}
                      disabled={locationLocked}
                      regionLabel="State / Territory"
                    />
                  </div>

                  <div className="pt-1">
                    <Button
                      type="submit"
                      disabled={!giggerCanSubmit || isSubmitting}
                      className={`w-full h-10 ${cfg.buttonClass}`}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {cfg.submitLoadingLabel}</>
                      ) : (
                        cfg.submitLabel
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
