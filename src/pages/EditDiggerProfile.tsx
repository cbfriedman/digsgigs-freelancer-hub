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
  sic_code: string[] | null;
  naics_code: string[] | null;
  custom_occupation_title: string | null;
  primary_profession_index: number | null;
}

const EditDiggerProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [profileId, setProfileId] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIndustryCodes, setSelectedIndustryCodes] = useState<IndustryCode[]>([]);
  const [customOccupationTitles, setCustomOccupationTitles] = useState<string[]>([]);
  const [primaryProfessionIndex, setPrimaryProfessionIndex] = useState<number>(0);

  // Construction/Trades category IDs where free estimates apply
  const CONSTRUCTION_CATEGORY_IDS = [
    'e6466529-cc0f-4d8f-bc84-30d0cd7f824b', // Construction (parent)
    'dab95fcc-a8ca-4cd4-b26f-96b6ff8a9bc0', // Electrical
    'e1e2aeb3-06f1-48c7-95ca-07929af7ef60', // General Building
    'c491164e-1054-4533-af24-490e2f6f7b10', // HVAC
    'ef88b721-6399-4844-a043-8cc7fa7a1234', // Landscaping
    '9491c946-5e2a-4189-a4f7-a23d5feb0a69', // Plumbing
    'f21b476d-54dc-4990-a16f-7024bf72de5b', // Civil Engineering
    '5ff074c0-f689-403c-9e7c-76b175dc2352', // Landscape Architecture
  ];

  // Check if any selected categories are construction-related
  const hasConstructionCategory = selectedCategories.some(catId => 
    CONSTRUCTION_CATEGORY_IDS.includes(catId)
  );
  
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
    pricing_model: "both" as "commission" | "hourly" | "both",
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
        pricing_model: (diggerProfile.pricing_model || "both") as "commission" | "hourly" | "both",
      });

      // Load selected categories
      const { data: categoriesData } = await supabase
        .from("digger_categories")
        .select("category_id")
        .eq("digger_id", diggerProfile.id);

      setSelectedCategories(categoriesData?.map(c => c.category_id) || []);

      // Load industry codes if they exist
      const loadedCodes: IndustryCode[] = [];
      const loadedTitles: string[] = [];

      if (diggerProfile.sic_code && diggerProfile.sic_code.length > 0) {
        for (const code of diggerProfile.sic_code) {
          const { data: industryCode } = await supabase
            .from("industry_codes")
            .select("*")
            .eq("code_type", "SIC")
            .eq("code", code)
            .single();
          
          if (industryCode) {
            loadedCodes.push({
              ...industryCode,
              code_type: "SIC"
            });
            loadedTitles.push(industryCode.title);
          }
        }
      }

      if (diggerProfile.naics_code && diggerProfile.naics_code.length > 0) {
        for (const code of diggerProfile.naics_code) {
          const { data: industryCode } = await supabase
            .from("industry_codes")
            .select("*")
            .eq("code_type", "NAICS")
            .eq("code", code)
            .single();
          
          if (industryCode) {
            loadedCodes.push({
              ...industryCode,
              code_type: "NAICS"
            });
            loadedTitles.push(industryCode.title);
          }
        }
      }

      setSelectedIndustryCodes(loadedCodes);
      if (diggerProfile.custom_occupation_title) {
        setCustomOccupationTitles(diggerProfile.custom_occupation_title.split(", "));
      } else {
        setCustomOccupationTitles(loadedTitles);
      }

      // Load primary profession index
      setPrimaryProfessionIndex(diggerProfile.primary_profession_index || 0);
    } catch (error: any) {
      toast.error(error.message);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0 && selectedIndustryCodes.length === 0) {
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
          pricing_model: formData.pricing_model,
          sic_code: selectedIndustryCodes.filter(c => c.code_type === "SIC").map(c => c.code),
          naics_code: selectedIndustryCodes.filter(c => c.code_type === "NAICS").map(c => c.code),
          custom_occupation_title: customOccupationTitles.length > 0 ? customOccupationTitles.join(", ") : null,
          primary_profession_index: primaryProfessionIndex,
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
                      Hourly leads: Pay tier cost upfront, then 1 hour rate when awarded
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

              {/* Payment & Service Options */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Payment & Service Options</h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-4 text-sm border border-border">
                  <p className="font-medium text-base">Choose how you want to work on the platform:</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-primary">1. Commission-Based Gigs (Bidding)</span>
                    </div>
                    <p className="text-muted-foreground ml-4">
                      Bid on projects and pay a commission only when you complete the work. You can participate in bidding regardless of your other settings.
                    </p>
                    <div className="ml-4 space-y-1 text-muted-foreground">
                      <p>• <strong>Lead Cost:</strong> Free tier ($3/lead), Pro ($1.50/lead), Premium ($0/lead)</p>
                      <p>• <strong>Commission:</strong> Free tier (9%, $5 min), Pro (4%, $5 min), Premium (0%)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-primary">2. Hourly Work</span>
                    </div>
                    <p className="text-muted-foreground ml-4">
                      Display your hourly rate range. Clients can hire you directly for hourly work. No commission charged on hourly contracts.
                    </p>
                  </div>

                  {hasConstructionCategory && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-primary">3. Free Estimates (Construction/Trades)</span>
                      </div>
                      <p className="text-muted-foreground ml-4">
                        Market yourself as offering free estimates for construction projects. This is a profile feature to attract clients - no charges apply.
                      </p>
                    </div>
                  )}
                </div>

                {hasConstructionCategory && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center space-x-2 p-3 bg-background rounded-lg border border-border">
                      <Checkbox
                        id="offers_free_estimates"
                        checked={formData.offers_free_estimates}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, offers_free_estimates: checked as boolean })
                        }
                      />
                      <Label htmlFor="offers_free_estimates" className="cursor-pointer font-medium">
                        I offer free estimates to potential clients
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Note: Free estimates are a great way to attract construction/trades clients!
                    </p>
                  </div>
                )}
                
                {!hasConstructionCategory && (
                  <div className="space-y-4 mt-4">
                    <Label className="text-base font-semibold">Choose Your Lead Pricing Model</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select how you want to be charged for leads. You'll always have access to commission-based bidding.
                    </p>
                    <RadioGroup
                      value={formData.pricing_model}
                      onValueChange={(value) => setFormData({ ...formData, pricing_model: value as "commission" | "hourly" | "both" })}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                        <RadioGroupItem value="commission" id="commission-only" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="commission-only" className="cursor-pointer font-medium">
                            Commission-Based Only (Bidding)
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Pay tier-based lead costs (Free: $3, Pro: $1.50, Premium: $0) plus commission when jobs complete
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                        <RadioGroupItem value="hourly" id="hourly-only" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="hourly-only" className="cursor-pointer font-medium">
                            Hourly Rate Work Only
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Upfront: Tier-based lead cost. When awarded: Additional 1 hour of your rate. No commission.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}
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
                onIndustryCodesChange={(codes, titles) => {
                  setSelectedIndustryCodes(codes);
                  setCustomOccupationTitles(titles);
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
