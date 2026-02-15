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

export default function FirstProfileCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileTitle, setProfileTitle] = useState("");
  const [country, setCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const regions = country ? getRegionsForCountry(country) : [];
  const showStateField = country && country !== "Other" && regions.length > 0;
  const canSubmit = profileTitle.trim().length >= 2 && country && (!showStateField || selectedState);

  useEffect(() => {
    if (!user) {
      navigate("/register", { replace: true });
      return;
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;

    setIsSubmitting(true);
    try {
      // 1. Ensure digger role exists
      let hasDiggerRole = false;
      try {
        const { data: hasRole } = await supabase.rpc("has_app_role", {
          _user_id: user.id,
          _role: "digger",
        });
        hasDiggerRole = hasRole === true;
      } catch {
        // Fallback: try get_user_app_roles_safe
        try {
          const { data: roles } = await (supabase.rpc as any)("get_user_app_roles_safe", {
            _user_id: user.id,
          });
          hasDiggerRole = Array.isArray(roles) && roles.some((r: any) => r.app_role === "digger");
        } catch {
          hasDiggerRole = false;
        }
      }

      if (!hasDiggerRole) {
        try {
          const { error } = await (supabase.rpc as any)("insert_user_app_role", {
            p_user_id: user.id,
            p_app_role: "digger",
          });
          if (error) {
            const { error: directError } = await supabase.from("user_app_roles").insert({
              user_id: user.id,
              app_role: "digger",
            });
            if (directError) throw directError;
          }
        } catch (err: any) {
          console.error("Error creating digger role:", err);
          toast.error("Could not register as Digger. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Build location string (digger service location)
      const locationParts = [selectedState, country].filter(Boolean);
      const locationString = locationParts.length > 0 ? locationParts.join(", ") : country || "Not specified";

      // 3. Get user full_name and phone from profiles
      let userPhone = "Not specified";
      let fullName: string | null = null;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("id", user.id)
          .single();
        if (profile?.phone) userPhone = profile.phone;
        if (profile?.full_name) fullName = profile.full_name;
      } catch {
        /* ignore */
      }
      if (!fullName && user.user_metadata?.full_name) {
        fullName = user.user_metadata.full_name;
      }

      // 4. Generate unique handle from real name (e.g. jackson_chen)
      const { data: existingHandles } = await supabase
        .from("digger_profiles")
        .select("handle")
        .not("handle", "is", null);
      const handle = getHandleForFirstProfile(
        fullName,
        (existingHandles || []).map((r) => r.handle).filter(Boolean) as string[]
      );

      // 5. Create minimal digger profile (handle auto-generated from real name)
      const { data: newProfile, error: createError } = await supabase
        .from("digger_profiles")
        .insert({
          user_id: user.id,
          handle,
          business_name: profileTitle.trim(),
          profile_name: profileTitle.trim(),
          profession: "General Services",
          location: locationString,
          country: country || null,
          state: selectedState || null,
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
        console.error("Profile creation error:", createError);
        toast.error(createError.message || "Failed to create profile. Please try again.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Profile created! Complete your profile to attract more clients.");
      goToEditProfile(navigate, newProfile.id, { replace: true });
    } catch (err: any) {
      console.error("First profile create error:", err);
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

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto py-8 px-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Create Your First Profile</CardTitle>
            <CardDescription>
              Start with a profile title and your service area. You can add professions, keywords, and more later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profile-title" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Profile Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="profile-title"
                  value={profileTitle}
                  onChange={(e) => setProfileTitle(e.target.value)}
                  placeholder="e.g., Plumbing Services, Tax Consulting, Web Design"
                  minLength={2}
                  maxLength={100}
                  required
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  A short name for this profile. Helps clients find you.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Service Location <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Where do you offer your services? This is your digger location.
                </p>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="country" className="text-sm">
                      Country
                    </Label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setSelectedState("");
                      }}
                      required
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
                    >
                      {COUNTRY_OPTIONS.map((opt) => (
                        <option key={opt.value || "empty"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showStateField && (
                    <div>
                      <Label htmlFor="state" className="text-sm">
                        {getRegionLabel(country)} / Territory
                      </Label>
                      <select
                        id="state"
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        required={showStateField}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
                      >
                        <option value="">Select...</option>
                        {regions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="w-full h-11"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating profile...
                    </>
                  ) : (
                    "Create Profile & Continue"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  You can add professions, keywords, and more in the next step.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
