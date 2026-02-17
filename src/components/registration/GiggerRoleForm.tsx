import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Briefcase, MapPin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getRegionsForCountry, getRegionLabel } from "@/config/locationData";

const giggerSchema = z.object({
  profileTitle: z.string()
    .trim()
    .min(2, "Profile title must be at least 2 characters")
    .max(100, "Profile title must be less than 100 characters"),
  country: z.string().min(1, "Please select a country"),
});

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

interface GiggerRoleFormProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  /** When provided, pre-fill and lock location (one user = one location) */
  existingLocation?: { country: string; state?: string | null } | null;
}

const GiggerRoleForm = ({ onComplete, onBack, existingLocation }: GiggerRoleFormProps) => {
  const [profileTitle, setProfileTitle] = useState("");
  const [country, setCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [preferences, setPreferences] = useState({
    receiveDiggerRecommendations: true,
    receiveNewBidNotifications: true,
    allowDirectContact: true,
  });

  const locationLocked = !!(existingLocation?.country);
  useEffect(() => {
    if (existingLocation?.country) {
      setCountry(existingLocation.country);
      setSelectedState(existingLocation.state ?? "");
    }
  }, [existingLocation?.country, existingLocation?.state]);

  const regions = country ? getRegionsForCountry(country) : [];
  const showStateField = country && country !== "Other" && regions.length > 0;
  const canSubmit =
    profileTitle.trim().length >= 2 &&
    country &&
    (!showStateField || selectedState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      giggerSchema.parse({ profileTitle, country });

      if (showStateField && !selectedState) {
        toast.error(`Please select a ${getRegionLabel(country)} / Territory`);
        return;
      }

      const locationParts = [
        selectedState || null,
        country || null,
      ].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(", ") : "Not specified";

      onComplete({
        profileTitle: profileTitle.trim(),
        country: country || null,
        state: selectedState || null,
        location,
        preferences,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Please fill in all required fields correctly");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {locationLocked ? "Add a profile title. Your location was set when you registered as Digger (one user, one location)." : "Add a profile title and location so professionals can find you when you post gigs."}
      </p>

      <div className="space-y-2">
        <Label htmlFor="profileTitle" className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Profile Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="profileTitle"
          type="text"
          placeholder="e.g., Project Owner, Hiring Manager, Startup Founder"
          value={profileTitle}
          onChange={(e) => setProfileTitle(e.target.value)}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location <span className="text-destructive">*</span>
          {locationLocked && (
            <span className="text-xs text-muted-foreground font-normal">(from your Digger profile)</span>
          )}
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          {locationLocked ? "Your location was set when you registered as Digger. One user, one location." : "Where are you located? Helps professionals understand your timezone and availability."}
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
              disabled={locationLocked}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1 disabled:opacity-60 disabled:pointer-events-none"
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
                disabled={locationLocked}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1 disabled:opacity-60 disabled:pointer-events-none"
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

      <Card className="bg-accent/50">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Communication Preferences (Optional)</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="recommendations"
                checked={preferences.receiveDiggerRecommendations}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    receiveDiggerRecommendations: !!checked,
                  }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="recommendations" className="text-sm font-medium cursor-pointer">
                  Receive digger recommendations
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when qualified professionals match your posted gigs
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="bidNotifications"
                checked={preferences.receiveNewBidNotifications}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    receiveNewBidNotifications: !!checked,
                  }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="bidNotifications" className="text-sm font-medium cursor-pointer">
                  New bid notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Instant alerts when professionals bid on your gigs
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="directContact"
                checked={preferences.allowDirectContact}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, allowDirectContact: !!checked }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="directContact" className="text-sm font-medium cursor-pointer">
                  Allow direct contact from diggers
                </Label>
                <p className="text-xs text-muted-foreground">
                  Let professionals message you directly about opportunities
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={!canSubmit} className="flex-1">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default GiggerRoleForm;
