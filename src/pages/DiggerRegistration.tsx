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
import { MapPin } from "lucide-react";
import { RegistrationCategorySelector } from "@/components/RegistrationCategorySelector";
import { geocodeAddress } from "@/utils/geocoding";

interface IndustryCode {
  id: string;
  code_type: "SIC" | "NAICS";
  code: string;
  title: string;
  description: string | null;
}

interface Reference {
  name: string;
  email: string;
  phone: string;
  description: string;
}

const DiggerRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedIndustryCode, setSelectedIndustryCode] = useState<IndustryCode | null>(null);
  const [customOccupationTitle, setCustomOccupationTitle] = useState("");
  const [references, setReferences] = useState<Reference[]>([{ name: "", email: "", phone: "", description: "" }]);
  
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
    offers_commission_bidding: true,
    offers_hourly_work: false,
    pricing_model: "both" as "commission" | "hourly" | "both",
    acceptTerms: false,
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    // TEMPORARILY DISABLED FOR SCREENSHOTS
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
  };

  const addReference = () => {
    setReferences([...references, { name: "", email: "", phone: "", description: "" }]);
  };

  const updateReference = (index: number, field: keyof Reference, value: string) => {
    const newReferences = [...references];
    newReferences[index][field] = value;
    setReferences(newReferences);
  };

  const removeReference = (index: number) => {
    if (references.length > 1) {
      setReferences(references.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0 && !selectedIndustryCode) {
      toast.error("Please select at least one category or industry code");
      return;
    }

    if (!formData.acceptTerms) {
      toast.error("Please accept the Terms of Service to continue");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Geocode the location
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
          toast.error("Could not geocode location. Profile will be created without map coordinates.");
        }
      }

      // Determine pricing model based on selections
      let pricingModel: "commission" | "hourly" | "both" = "commission";
      if (formData.offers_commission_bidding && formData.offers_hourly_work) {
        pricingModel = "both";
      } else if (formData.offers_hourly_work) {
        pricingModel = "hourly";
      } else {
        pricingModel = "commission";
      }

      // Create digger profile
      const { data: diggerProfile, error: profileError } = await supabase
        .from("digger_profiles")
        .insert({
          user_id: session.user.id,
          handle: formData.handle,
          business_name: formData.business_name,
          phone: formData.phone,
          location: formData.location,
          location_lat: locationLat,
          location_lng: locationLng,
          profession: formData.profession,
          bio: formData.bio,
          portfolio_url: formData.portfolio_url || null,
          hourly_rate_min: formData.hourly_rate_min ? parseFloat(formData.hourly_rate_min) : null,
          hourly_rate_max: formData.hourly_rate_max ? parseFloat(formData.hourly_rate_max) : null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
          availability: formData.availability || null,
          is_insured: formData.is_insured,
          is_bonded: formData.is_bonded,
          is_licensed: formData.is_licensed,
          offers_free_estimates: formData.offers_free_estimates,
          pricing_model: pricingModel,
          sic_code: selectedIndustryCode?.code_type === "SIC" ? selectedIndustryCode.code : null,
          naics_code: selectedIndustryCode?.code_type === "NAICS" ? selectedIndustryCode.code : null,
          custom_occupation_title: customOccupationTitle || null,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Add selected categories
      const categoryInserts = selectedCategories.map((categoryId) => ({
        digger_id: diggerProfile.id,
        category_id: categoryId,
      }));

      const { error: categoriesError } = await supabase
        .from("digger_categories")
        .insert(categoryInserts);

      if (categoriesError) throw categoriesError;

      // Add references
      const validReferences = references.filter(
        (ref) => ref.name && ref.email
      );

      if (validReferences.length > 0) {
        const referenceInserts = validReferences.map((ref) => ({
          digger_id: diggerProfile.id,
          reference_name: ref.name,
          reference_email: ref.email,
          reference_phone: ref.phone || null,
          project_description: ref.description || null,
        }));

        const { error: referencesError } = await supabase
          .from("references")
          .insert(referenceInserts);

        if (referencesError) throw referencesError;
      }

      toast.success("Profile created successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Digger Registration</CardTitle>
            <CardDescription>
              Complete your profile to start receiving gig opportunities. You can register under multiple categories.
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
                    placeholder="e.g., electrician_mike, lawyer_susan, designer_alex"
                    required
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a unique username. Your real name/business will stay private. Only lowercase letters, numbers, and underscores.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name (Private) *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="Your business or professional name"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This is kept private and not shown to consumers
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Primary Profession *</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="e.g., Licensed Electrician, Attorney, Web Developer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio *</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Describe your skills, experience, and what makes you stand out..."
                    required
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_min">Hourly Rate Min ($)</Label>
                    <Input
                      id="hourly_rate_min"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate_min}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_min: e.target.value })}
                      placeholder="50.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_max">Hourly Rate Max ($)</Label>
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
                      Bid on projects and access leads based on your subscription tier.
                    </p>
                    <div className="ml-4 space-y-1 text-muted-foreground">
                      <p>• <strong>Lead Cost:</strong> Free ($60/lead), Pro ($40/lead), Premium ($20/lead)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-primary">2. Hourly Work</span>
                    </div>
                    <p className="text-muted-foreground ml-4">
                      Display your hourly rate range. When awarded hourly work, you pay an upcharge based on your tier.
                    </p>
                    <div className="ml-4 space-y-1 text-muted-foreground">
                      <p>• <strong>Hourly Award Upcharge:</strong> Free (3 hours of your rate), Pro (2 hours), Premium (1 hour)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-primary">3. Free Estimates</span>
                    </div>
                    <p className="text-muted-foreground ml-4">
                      Market yourself as offering free estimates. When a client requests an estimate, you pay an upcharge.
                    </p>
                    <div className="ml-4 space-y-1 text-muted-foreground">
                      <p>• <strong>Free Estimate Upcharge:</strong> Free ($100), Pro ($75), Premium ($50)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  <Label className="text-base font-semibold">Select Your Service Options</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose which types of work you want to offer. You can select multiple options.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                      <Checkbox
                        id="offers_commission_bidding"
                        checked={formData.offers_commission_bidding}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, offers_commission_bidding: checked as boolean })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="offers_commission_bidding" className="cursor-pointer font-medium">
                          Commission-Based Gigs (Bidding)
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lead Cost: Free ($60), Pro ($40), Premium ($20)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                      <Checkbox
                        id="offers_hourly_work"
                        checked={formData.offers_hourly_work}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, offers_hourly_work: checked as boolean })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="offers_hourly_work" className="cursor-pointer font-medium">
                          Hourly Rate Work
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Hourly Award Upcharge: Free (3 hours), Pro (2 hours), Premium (1 hour)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                      <Checkbox
                        id="offers_free_estimates"
                        checked={formData.offers_free_estimates}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, offers_free_estimates: checked as boolean })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="offers_free_estimates" className="cursor-pointer font-medium">
                          Free Estimates
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Free Estimate Upcharge: Free ($100), Pro ($75), Premium ($50)
                        </p>
                      </div>
                    </div>
                  </div>
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

                <p className="text-sm text-muted-foreground">
                  These credentials will be displayed on your profile to build trust with consumers
                </p>
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

              {/* References */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">Verifiable References</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add references with contact information. This information is private and only visible to you.
                  </p>
                </div>
                {references.map((ref, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Reference {index + 1}</h4>
                        {references.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeReference(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={ref.name}
                            onChange={(e) => updateReference(index, "name", e.target.value)}
                            placeholder="John Smith"
                            required={index === 0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={ref.email}
                            onChange={(e) => updateReference(index, "email", e.target.value)}
                            placeholder="john@example.com"
                            required={index === 0}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          type="tel"
                          value={ref.phone}
                          onChange={(e) => updateReference(index, "phone", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Project Description</Label>
                        <Textarea
                          value={ref.description}
                          onChange={(e) => updateReference(index, "description", e.target.value)}
                          placeholder="Describe the project you worked on with this reference..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addReference} className="w-full">
                  Add Another Reference
                </Button>
              </div>

              <Separator />

              {/* Terms Acceptance */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked as boolean })}
                    required
                  />
                  <Label htmlFor="acceptTerms" className="cursor-pointer leading-relaxed">
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => window.open("/terms", "_blank")}
                      className="text-primary hover:underline"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => window.open("/privacy", "_blank")}
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </button>
                    . I understand that DiggsAndGiggs is a marketplace platform and all work agreements are between me and the client directly.
                  </Label>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating Profile..." : "Create Digger Profile"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiggerRegistration;
