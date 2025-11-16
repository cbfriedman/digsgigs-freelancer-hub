import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Save, Loader2, MapPin } from "lucide-react";
import { RegistrationCategorySelector } from "@/components/RegistrationCategorySelector";
import { geocodeAddress } from "@/utils/geocoding";

interface IndustryCode {
  id: string;
  code_type: "SIC" | "NAICS";
  code: string;
  title: string;
  description: string | null;
}

interface DiggerProfile {
  id: string;
  handle: string | null;
  business_name: string;
  phone: string;
  location: string;
  profession: string;
  bio: string | null;
  portfolio_url: string | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  years_experience: number | null;
  availability: string | null;
  is_insured: boolean;
  is_bonded: boolean;
  is_licensed: string;
  offers_free_estimates: boolean;
  sic_code: string | null;
  naics_code: string | null;
  custom_occupation_title: string | null;
}

const EditDiggerProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [profileId, setProfileId] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIndustryCode, setSelectedIndustryCode] = useState<IndustryCode | null>(null);
  const [customOccupationTitle, setCustomOccupationTitle] = useState("");
  
  const [formData, setFormData] = useState({
    handle: "",
    business_name: "",
    phone: "",
    location: "",
    profession: "",
    bio: "",
    portfolio_url: "",
    hourly_rate_min: "",
    hourly_rate_max: "",
    years_experience: "",
    availability: "",
    is_insured: false,
    is_bonded: false,
    is_licensed: "not_required" as "yes" | "no" | "not_required",
    offers_free_estimates: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // TEMPORARILY DISABLED FOR SCREENSHOTS
      setLoading(false);
      return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is a digger
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .single();

      if (profile?.user_type !== "digger") {
        toast.error("Only diggers can access this page");
        navigate("/");
        return;
      }

      // Load digger profile
      const { data: diggerProfile, error: profileError } = await supabase
        .from("digger_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (profileError || !diggerProfile) {
        toast.error("Profile not found");
        navigate("/");
        return;
      }

      setProfileId(diggerProfile.id);
      setFormData({
        handle: diggerProfile.handle || "",
        business_name: diggerProfile.business_name,
        phone: diggerProfile.phone,
        location: diggerProfile.location,
        profession: diggerProfile.profession,
        bio: diggerProfile.bio || "",
        portfolio_url: diggerProfile.portfolio_url || "",
        hourly_rate_min: diggerProfile.hourly_rate_min?.toString() || "",
        hourly_rate_max: diggerProfile.hourly_rate_max?.toString() || "",
        years_experience: diggerProfile.years_experience?.toString() || "",
        availability: diggerProfile.availability || "",
        is_insured: diggerProfile.is_insured || false,
        is_bonded: diggerProfile.is_bonded || false,
        is_licensed: diggerProfile.is_licensed as "yes" | "no" | "not_required",
        offers_free_estimates: diggerProfile.offers_free_estimates || false,
      });

      // Load selected categories
      const { data: categoriesData } = await supabase
        .from("digger_categories")
        .select("category_id")
        .eq("digger_id", diggerProfile.id);

      setSelectedCategories(categoriesData?.map(c => c.category_id) || []);

      // Set industry code if exists
      if (diggerProfile.sic_code || diggerProfile.naics_code) {
        const codeType = diggerProfile.sic_code ? "SIC" : "NAICS";
        const code = diggerProfile.sic_code || diggerProfile.naics_code;
        
        const { data: industryCode } = await supabase
          .from("industry_codes")
          .select("*")
          .eq("code_type", codeType)
          .eq("code", code)
          .single();

        if (industryCode) {
          setSelectedIndustryCode({
            ...industryCode,
            code_type: industryCode.code_type as "SIC" | "NAICS"
          });
          setCustomOccupationTitle(diggerProfile.custom_occupation_title || industryCode.title);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0 && !selectedIndustryCode) {
      toast.error("Please select at least one category or industry code");
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Geocode the location if it changed
      let locationLat: number | undefined;
      let locationLng: number | undefined;
      
      if (formData.location) {
        setGeocoding(true);
        const geocodeResult = await geocodeAddress(formData.location);
        setGeocoding(false);
        
        if (geocodeResult) {
          locationLat = geocodeResult.latitude;
          locationLng = geocodeResult.longitude;
          toast.success("Location geocoded successfully");
        } else {
          toast.error("Could not geocode location. Profile will be updated without map coordinates.");
        }
      }

      // Update digger profile
      const { error: profileError } = await supabase
        .from("digger_profiles")
        .update({
          handle: formData.handle,
          business_name: formData.business_name,
          phone: formData.phone,
          location: formData.location,
          location_lat: locationLat,
          location_lng: locationLng,
          profession: formData.profession,
          bio: formData.bio || null,
          portfolio_url: formData.portfolio_url || null,
          hourly_rate_min: formData.hourly_rate_min ? parseFloat(formData.hourly_rate_min) : null,
          hourly_rate_max: formData.hourly_rate_max ? parseFloat(formData.hourly_rate_max) : null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
          availability: formData.availability || null,
          is_insured: formData.is_insured,
          is_bonded: formData.is_bonded,
          is_licensed: formData.is_licensed,
          offers_free_estimates: formData.offers_free_estimates,
          sic_code: selectedIndustryCode?.code_type === "SIC" ? selectedIndustryCode.code : null,
          naics_code: selectedIndustryCode?.code_type === "NAICS" ? selectedIndustryCode.code : null,
          custom_occupation_title: customOccupationTitle || null,
        })
        .eq("id", profileId);

      if (profileError) throw profileError;

      // Delete existing categories and insert new ones
      const { error: deleteError } = await supabase
        .from("digger_categories")
        .delete()
        .eq("digger_id", profileId);

      if (deleteError) throw deleteError;

      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map((categoryId) => ({
          digger_id: profileId,
          category_id: categoryId,
        }));

        const { error: categoriesError } = await supabase
          .from("digger_categories")
          .insert(categoryInserts);

        if (categoriesError) throw categoriesError;
      }

      toast.success("Profile updated successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Edit Your Profile</CardTitle>
            <CardDescription>
              Update your profile information to keep it current and attract more gig opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Basic Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="handle">Display Handle *</Label>
                  <Input
                    id="handle"
                    value={formData.handle}
                    onChange={(e) => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="e.g., electrician_mike, lawyer_susan"
                    required
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your public username. Only lowercase letters, numbers, and underscores.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name (Private) *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Private) *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    Location *
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, State or Zip Code"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll convert this to map coordinates for location-based filtering
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession *</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="e.g., Electrician, Lawyer, Web Developer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell potential clients about your experience and expertise..."
                    rows={4}
                  />
                </div>
              </div>

              <Separator />

              {/* Professional Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Professional Details</h3>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/pricing-strategy")}
                    className="text-primary"
                  >
                    📊 Pricing Strategy Guide
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_min">Min Hourly Rate ($)</Label>
                    <Input
                      id="hourly_rate_min"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate_min}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_min: e.target.value })}
                      placeholder="50.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your rate determines lead costs (min $100)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_max">Max Hourly Rate ($)</Label>
                    <Input
                      id="hourly_rate_max"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate_max}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_max: e.target.value })}
                      placeholder="150.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_experience">Years of Experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    placeholder="e.g., Full-time, Part-time, Weekends"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio/Website URL</Label>
                  <Input
                    id="portfolio_url"
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <Separator />

              {/* Trust Signals */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Professional Credentials</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_insured"
                      checked={formData.is_insured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_insured: checked as boolean })}
                    />
                    <Label htmlFor="is_insured" className="cursor-pointer">
                      I am insured
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_bonded"
                      checked={formData.is_bonded}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_bonded: checked as boolean })}
                    />
                    <Label htmlFor="is_bonded" className="cursor-pointer">
                      I am bonded
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="offers_free_estimates"
                      checked={formData.offers_free_estimates}
                      onCheckedChange={(checked) => setFormData({ ...formData, offers_free_estimates: checked as boolean })}
                    />
                    <Label htmlFor="offers_free_estimates" className="cursor-pointer">
                      I offer free estimates
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Free tier:</strong> $100 per estimate request. <strong>Pro/Premium:</strong> Unlimited free estimates at no charge!
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Licensed Status</Label>
                  <RadioGroup 
                    value={formData.is_licensed} 
                    onValueChange={(value) => setFormData({ ...formData, is_licensed: value as "yes" | "no" | "not_required" })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="licensed_yes" />
                      <Label htmlFor="licensed_yes" className="cursor-pointer font-normal">
                        Yes, I am licensed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="licensed_no" />
                      <Label htmlFor="licensed_no" className="cursor-pointer font-normal">
                        No, I am not licensed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not_required" id="licensed_not_required" />
                      <Label htmlFor="licensed_not_required" className="cursor-pointer font-normal">
                        License not required for my profession
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <Separator />

              {/* Categories */}
              <RegistrationCategorySelector
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                onIndustryCodeChange={(code, title) => {
                  setSelectedIndustryCode(code);
                  setCustomOccupationTitle(title);
                }}
              />

              <Separator />

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || geocoding}>
                  {geocoding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Geocoding...
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditDiggerProfile;
