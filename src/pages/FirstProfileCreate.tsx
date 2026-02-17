import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { getRegionsForCountry, getRegionLabel } from "@/config/locationData";
import { goToEditProfile } from "@/lib/profileWorkspaceRoute";
import { getHandleForFirstProfile } from "@/lib/generateHandle";
import { ensureProfileFromAuth } from "@/lib/ensureProfileFromAuth";
import { ensureGiggerProfile } from "@/lib/ensureGiggerProfile";
import { PageLayout } from "@/components/layout/PageLayout";

const COUNTRY_OPTIONS = [
  { value: "", label: "Select a country..." },
  { value: "United States", label: "🇺🇸 United States" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Mexico", label: "🇲🇽 Mexico" },
  { value: "Brazil", label: "🇧🇷 Brazil" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Other", label: "🌍 Other" },
];

type SetupMode = "digger" | "gigger" | null;

/** Role-specific theme and copy so Digger vs Gigger feel clearly different */
const ROLE_CONFIG: Record<
  "digger" | "gigger",
  {
    cardClass: string;
    iconClass: string;
    buttonClass: string;
    taglineClass: string;
    tagline: string;
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
    cardClass: "border-l-4 border-l-primary",
    iconClass: "text-primary",
    buttonClass: "",
    taglineClass: "text-primary",
    tagline: "Find work you love. Get matched with gigs and grow your business.",
    title: "Create Your Digger Profile",
    description: "Start with a profile title and your service area. You can add professions, keywords, and more later.",
    profileLabel: "Profile Title",
    profilePlaceholder: "e.g., Full Stack Development, Mobile App Development, DevOps Consulting",
    profileHint: "A short name for this profile. Helps clients find you.",
    locationLabel: "Service Location",
    locationHint: "Where do you offer your services? This is your digger location.",
    locationLockedHint: "Your location was set when you registered as Gigger. One user, one location.",
    submitLabel: "Create Profile & Continue",
    submitLoadingLabel: "Creating profile...",
    footerHint: "You can add professions, keywords, and more in the next step.",
  },
  gigger: {
    cardClass: "border-l-4 border-l-emerald-500/80 dark:border-l-emerald-400/60",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
    taglineClass: "text-emerald-600 dark:text-emerald-400",
    tagline: "You’ll use this when posting gigs and reviewing bids.",
    title: "Create Your Gigger Profile",
    description: "Add a profile title and location so professionals can find you when you post gigs.",
    profileLabel: "Profile Title",
    profilePlaceholder: "e.g., Acme Co., Marketing Team, Sarah’s Studio",
    profileHint: "How you’ll appear to professionals when you post gigs.",
    locationLabel: "Location",
    locationHint: "Where you’re based. Helps professionals understand your timezone and availability.",
    locationLockedHint: "Your location was set when you registered as Digger. One user, one location.",
    submitLabel: "Continue",
    submitLoadingLabel: "Saving...",
    footerHint: "",
  },
};

export default function FirstProfileCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>(null);
  const [hasDiggerProfile, setHasDiggerProfile] = useState(false);
  const [diggerCompleted, setDiggerCompleted] = useState(false);

  // Digger form state
  const [profileTitle, setProfileTitle] = useState("");
  const [country, setCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [locationLocked, setLocationLocked] = useState(false);

  // Gigger form state (separate so we don't overwrite when switching)
  const [giggerProfileTitle, setGiggerProfileTitle] = useState("");
  const [giggerCountry, setGiggerCountry] = useState("");
  const [giggerState, setGiggerState] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const regions = (setupMode === "digger" ? country : giggerCountry) ? getRegionsForCountry(setupMode === "digger" ? country : giggerCountry) : [];
  const showStateField = (setupMode === "digger" ? country : giggerCountry) && (setupMode === "digger" ? country : giggerCountry) !== "Other" && regions.length > 0;
  const diggerCanSubmit = profileTitle.trim().length >= 2 && country && (!showStateField || selectedState);
  const giggerCanSubmit = giggerProfileTitle.trim().length >= 2 && giggerCountry && (!(giggerCountry && giggerCountry !== "Other" && getRegionsForCountry(giggerCountry).length > 0) || giggerState);

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
        const { data: roles } = await (supabase.rpc as any)("get_user_app_roles_safe", { _user_id: user.id });
        const roleList = Array.isArray(roles) ? roles : [];
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

        let giggerProfileExists = false;
        if (hasGigger) {
          const { data: gp } = await supabase.from("gigger_profiles").select("user_id").eq("user_id", user.id).limit(1).maybeSingle();
          giggerProfileExists = !!gp?.user_id;
        }

        const needDiggerSetup = hasDigger && !diggerProfileExists;
        const needGiggerSetup = hasGigger && !giggerProfileExists;

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
  }, [user, navigate, diggerCompleted]);

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
          setGiggerCountry(diggerLoc.country);
          if (diggerLoc.state) setGiggerState(diggerLoc.state);
          setLocationLocked(true);
        } else if (profile?.country) {
          setGiggerCountry(profile.country);
          if (profile.state) setGiggerState(profile.state);
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
          setCountry(data.country);
          if (data.state) setSelectedState(data.state);
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

      const countryVal = country || null;
      const stateVal = selectedState || null;
      const locationParts = [stateVal, countryVal].filter(Boolean);
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
          city: null,
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
      const { data: gp } = await supabase.from("gigger_profiles").select("user_id").eq("user_id", user.id).limit(1).maybeSingle();
      const needGiggerSetup = hasGigger && !gp?.user_id;
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
        country: giggerCountry || null,
        state: giggerState || null,
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

  const giggerRegions = giggerCountry ? getRegionsForCountry(giggerCountry) : [];
  const giggerShowState = giggerCountry && giggerCountry !== "Other" && giggerRegions.length > 0;

  const cfg = setupMode ? ROLE_CONFIG[setupMode] : null;
  const selectClass =
    "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1 disabled:opacity-60 disabled:pointer-events-none";

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto py-8 px-4">
        {cfg && (
          <Card className={cfg.cardClass}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">{cfg.title}</CardTitle>
              <CardDescription>{cfg.description}</CardDescription>
              <p className={`text-xs mt-1 ${cfg.taglineClass}`}>{cfg.tagline}</p>
            </CardHeader>
            <CardContent>
              {setupMode === "digger" && (
                <form onSubmit={handleDiggerSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="profile-title" className="flex items-center gap-2">
                      <Briefcase className={`h-4 w-4 ${cfg.iconClass}`} />
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
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">{cfg.profileHint}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className={`h-4 w-4 ${cfg.iconClass}`} />
                      {cfg.locationLabel} <span className="text-destructive">*</span>
                      {locationLocked && (
                        <span className="text-xs text-muted-foreground font-normal">
                          ({setupMode === "digger" ? "from your Gigger profile" : "from your Digger profile"})
                        </span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {locationLocked ? cfg.locationLockedHint : cfg.locationHint}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="country" className="text-sm">Country</Label>
                        <select
                          id="country"
                          value={country}
                          onChange={(e) => { setCountry(e.target.value); setSelectedState(""); }}
                          required
                          disabled={locationLocked}
                          className={selectClass}
                        >
                          {COUNTRY_OPTIONS.map((opt) => (
                            <option key={opt.value || "empty"} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      {showStateField && (
                        <div>
                          <Label htmlFor="state" className="text-sm">{getRegionLabel(country)} / Territory</Label>
                          <select
                            id="state"
                            value={selectedState}
                            onChange={(e) => setSelectedState(e.target.value)}
                            required
                            disabled={locationLocked}
                            className={selectClass}
                          >
                            <option value="">Select...</option>
                            {regions.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={!diggerCanSubmit || isSubmitting}
                      className={`w-full h-11 ${cfg.buttonClass}`}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {cfg.submitLoadingLabel}</>
                      ) : (
                        cfg.submitLabel
                      )}
                    </Button>
                    {cfg.footerHint && (
                      <p className="text-xs text-muted-foreground text-center mt-3">{cfg.footerHint}</p>
                    )}
                  </div>
                </form>
              )}

              {setupMode === "gigger" && (
                <form onSubmit={handleGiggerSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="gigger-profile-title" className="flex items-center gap-2">
                      <Briefcase className={`h-4 w-4 ${cfg.iconClass}`} />
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
                      className="h-11 placeholder:text-muted-foreground/70"
                    />
                    <p className="text-xs text-muted-foreground">{cfg.profileHint}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className={`h-4 w-4 ${cfg.iconClass}`} />
                      {cfg.locationLabel} <span className="text-destructive">*</span>
                      {locationLocked && (
                        <span className="text-xs text-muted-foreground font-normal">(from your Digger profile)</span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {locationLocked ? cfg.locationLockedHint : cfg.locationHint}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="gigger-country" className="text-sm">Country</Label>
                        <select
                          id="gigger-country"
                          value={giggerCountry}
                          onChange={(e) => { setGiggerCountry(e.target.value); setGiggerState(""); }}
                          required
                          disabled={locationLocked}
                          className={selectClass}
                        >
                          {COUNTRY_OPTIONS.map((opt) => (
                            <option key={opt.value || "empty"} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      {giggerShowState && (
                        <div>
                          <Label htmlFor="gigger-state" className="text-sm">{getRegionLabel(giggerCountry)} / Territory</Label>
                          <select
                            id="gigger-state"
                            value={giggerState}
                            onChange={(e) => setGiggerState(e.target.value)}
                            required
                            disabled={locationLocked}
                            className={selectClass}
                          >
                            <option value="">Select...</option>
                            {giggerRegions.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={!giggerCanSubmit || isSubmitting}
                      className={`w-full h-11 ${cfg.buttonClass}`}
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
