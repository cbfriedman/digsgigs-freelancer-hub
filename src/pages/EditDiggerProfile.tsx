import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { Loader2, Tag, MapPin, Plus, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KeywordSuggestions } from "@/components/KeywordSuggestions";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
// Native radio inputs used instead of RadioGroup to avoid infinite loop bug
import { BioGenerator } from "@/components/BioGenerator";
import { ProfileCompletionWidget } from "@/components/ProfileCompletionWidget";
import { getLeadTierDescription, INDUSTRY_PRICING, INDUSTRY_GROUPS, getLeadCostForIndustry, getIndustryCategory } from "@/config/pricing";
import { GOOGLE_CPC_KEYWORDS } from "@/config/googleCpcKeywords";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ProfileTitleTaglineEditor } from "@/components/ProfileTitleTaglineEditor";
import { DiggerProfileCard } from "@/components/DiggerProfileCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EditDiggerProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { id: profileIdParam } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [customProfession, setCustomProfession] = useState("");
  const [showAddProfessionDialog, setShowAddProfessionDialog] = useState(false);
  const [professionSearch, setProfessionSearch] = useState("");
  const [location, setLocation] = useState("");
  
  const [profileCategory, setProfileCategory] = useState<string>("");
  
  // Generate profession list filtered by profile's category
  const professionOptions = useMemo(() => {
    if (!profileCategory) {
      // Fallback to all professions if no category
      const allProfessions = new Set<string>();
      INDUSTRY_GROUPS.forEach(group => {
        group.industries.forEach(ind => {
          allProfessions.add(ind.name);
        });
      });
      return Array.from(allProfessions).sort();
    }
    
    // Find the category in INDUSTRY_GROUPS
    const categoryGroup = INDUSTRY_GROUPS.find(
      g => g.categoryName.toLowerCase() === profileCategory.toLowerCase()
    );
    
    if (categoryGroup) {
      return categoryGroup.industries.map(ind => ind.name).sort();
    }
    
    // Fallback to all
    const allProfessions = new Set<string>();
    INDUSTRY_GROUPS.forEach(group => {
      group.industries.forEach(ind => {
        allProfessions.add(ind.name);
      });
    });
    return Array.from(allProfessions).sort();
  }, [profileCategory]);
  
  // Helper to get CPC and lead cost for a profession
  const getProfessionPricing = (professionName: string) => {
    const normalizedName = professionName.toLowerCase().trim();
    
    // Search through GOOGLE_CPC_KEYWORDS industry data
    let cpc: number | null = null;
    for (const industryData of GOOGLE_CPC_KEYWORDS) {
      // Check if the industry name matches
      if (industryData.industry.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(industryData.industry.toLowerCase())) {
        cpc = industryData.averageCpc;
        break;
      }
      // Check individual keywords
      const keywordMatch = industryData.keywords.find(
        kw => kw.keyword.toLowerCase().includes(normalizedName) ||
              normalizedName.includes(kw.keyword.toLowerCase())
      );
      if (keywordMatch) {
        cpc = keywordMatch.cpc;
        break;
      }
    }
    
    const leadCost = getLeadCostForIndustry(professionName, 'non-exclusive', false, profileCategory);
    const category = getIndustryCategory(professionName, profileCategory);
    
    return { cpc, leadCost, category };
  };
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [profileId, setProfileId] = useState<string>("");
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [hourlyRateMin, setHourlyRateMin] = useState<number | null>(null);
  const [hourlyRateMax, setHourlyRateMax] = useState<number | null>(null);
  const [pricingModel, setPricingModel] = useState<string>("commission");
  
  const [profileData, setProfileData] = useState<any>(null);
  const [expectedLeadVolume, setExpectedLeadVolume] = useState<number | null>(null);
  const [expectedLeadPeriod, setExpectedLeadPeriod] = useState<string>('monthly');
  const [photoUrl, setPhotoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [locationPreferenceType, setLocationPreferenceType] = useState<"zip_codes" | "radius">("zip_codes");
  const [serviceZipCodes, setServiceZipCodes] = useState("");
  const [serviceRadiusCenter, setServiceRadiusCenter] = useState("");
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState<number>(25);
  const [country, setCountry] = useState("United States");

  // Parse keywords from input
  const keywords = keywordsInput
    .split(/[,;]/)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Support both URL params (/edit-digger-profile/:profileId) and query params (?profileId=xxx)
    const profileIdFromUrl = profileIdParam || searchParams.get('profileId');
    if (profileIdFromUrl) {
      setProfileId(profileIdFromUrl);
    }
    
    loadProfile();
    checkSubscription();
  }, [user, navigate, searchParams]);

  const checkSubscription = async () => {
    try {
      const { data } = await supabase.functions.invoke('check-subscription');
      if (data?.tier) {
        setSubscriptionTier(data.tier);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    // Get profileId from URL params or query params
    const profileIdFromUrl = profileIdParam || searchParams.get('profileId');

    try {
      let query = supabase
        .from("digger_profiles")
        .select("*, digger_categories(category_id)")
        .eq("user_id", user.id);
      
      // If a specific profileId is provided, load that profile
      if (profileIdFromUrl) {
        query = query.eq("id", profileIdFromUrl);
      }
      
      const { data: profiles, error } = await query;

      if (error) throw error;

      // Get the specific profile or the first one
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;

      if (profile) {
        setProfileId(profile.id);
        setBusinessName(profile.business_name || "");
        // Parse comma-separated professions into array
        const professionsList = profile.profession 
          ? profile.profession.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
          : [];
        setSelectedProfessions(professionsList);
        setLocation(profile.location || "");
        setPhone(profile.phone || "");
        setBio(profile.bio || "");
        
        // Load location preferences
        if (profile.service_zip_codes && profile.service_zip_codes.length > 0) {
          setLocationPreferenceType("zip_codes");
          setServiceZipCodes(profile.service_zip_codes.join(", "));
        } else if (profile.service_radius_center) {
          setLocationPreferenceType("radius");
          setServiceRadiusCenter(profile.service_radius_center || "");
          setServiceRadiusMiles(profile.service_radius_miles || 25);
        }
        setCountry(profile.country || "United States");
        
        // Check for keywords from sessionStorage first (from category browser)
        const savedKeywordsData = sessionStorage.getItem('selectedKeywords');
        if (savedKeywordsData) {
          try {
            const parsedData = JSON.parse(savedKeywordsData);
            if (parsedData.keywords && parsedData.keywords.length > 0) {
              setKeywordsInput(parsedData.keywords.join(", "));
              // Clear from sessionStorage after using
              sessionStorage.removeItem('selectedKeywords');
            } else {
              setKeywordsInput(profile.keywords?.join(", ") || "");
            }
          } catch {
            setKeywordsInput(profile.keywords?.join(", ") || "");
          }
        } else {
          setKeywordsInput(profile.keywords?.join(", ") || "");
        }
        
        setHourlyRateMin(profile.hourly_rate_min);
        setHourlyRateMax(profile.hourly_rate_max);
        setPricingModel(profile.pricing_model || "commission");
        
        setExpectedLeadVolume(profile.expected_lead_volume);
        setExpectedLeadPeriod(profile.expected_lead_period || 'monthly');
        setPhotoUrl(profile.profile_image_url || "");
        setTitle(profile.custom_occupation_title || "");
        setTagline(profile.tagline || "");
        setProfileData(profile);
        
        // Load category name from digger_categories
        if (profile.digger_categories && profile.digger_categories.length > 0) {
          const categoryId = profile.digger_categories[0].category_id;
          if (categoryId) {
            const { data: categoryData } = await supabase
              .from('categories')
              .select('name')
              .eq('id', categoryId)
              .single();
            
            if (categoryData?.name) {
              setProfileCategory(categoryData.name);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileId) return;

    if (!businessName || selectedProfessions.length === 0 || !location || !phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    const professionString = selectedProfessions.join(', ');

    if (!pricingModel) {
      toast.error("Please select a pricing option (Fixed Price, Hourly, or Both Models)");
      return;
    }

    setLoading(true);

    try {
      // Calculate lead tier description based on professions
      const leadTierDescription = getLeadTierDescription(selectedProfessions);

      // Parse location preferences
      const zipCodesArray = locationPreferenceType === "zip_codes" && serviceZipCodes
        ? serviceZipCodes.split(/[,;]/).map(z => z.trim()).filter(z => z.length > 0)
        : null;

      const { error } = await supabase
        .from("digger_profiles")
        .update({
          business_name: businessName,
          company_name: businessName,
          profession: professionString,
          location,
          phone,
          bio: bio || null,
          keywords: keywords.length > 0 ? keywords : null,
          pricing_model: pricingModel,
          
          expected_lead_volume: expectedLeadVolume,
          expected_lead_period: expectedLeadPeriod,
          lead_tier_description: leadTierDescription || null,
          profile_image_url: photoUrl || null,
          custom_occupation_title: title || null,
          tagline: tagline || null,
          service_zip_codes: zipCodesArray,
          service_radius_center: locationPreferenceType === "radius" ? serviceRadiusCenter || null : null,
          service_radius_miles: locationPreferenceType === "radius" ? serviceRadiusMiles : null,
          country: country,
        })
        .eq("id", profileId);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      navigate(`/digger/${profileId}`);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Highlight keywords in real-time
  const highlightKeywords = (text: string): { text: string; isKeyword: boolean }[] => {
    const parts: { text: string; isKeyword: boolean }[] = [];
    
    if (keywords.length === 0) {
      return [{ text, isKeyword: false }];
    }
    
    let currentIndex = 0;
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    
    while (currentIndex < text.length) {
      let foundKeyword = false;
      
      for (const keyword of sortedKeywords) {
        const remaining = text.slice(currentIndex);
        if (remaining.toLowerCase().startsWith(keyword.toLowerCase())) {
          parts.push({ text: text.slice(currentIndex, currentIndex + keyword.length), isKeyword: true });
          currentIndex += keyword.length;
          foundKeyword = true;
          break;
        }
      }
      
      if (!foundKeyword) {
        parts.push({ text: text[currentIndex], isKeyword: false });
        currentIndex++;
      }
    }
    
    return parts;
  };

  // Add a suggested keyword
  const handleAddKeyword = async (keyword: string) => {
    const currentKeywords = keywordsInput
      .split(/[,;]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    if (!currentKeywords.some(kw => kw.toLowerCase() === keyword.toLowerCase())) {
      const newKeywordsInput = currentKeywords.length > 0 
        ? `${keywordsInput.trim()}, ${keyword}`
        : keyword;
      setKeywordsInput(newKeywordsInput);
      toast.success(`Added "${keyword}" to keywords`);
      
      // Track keyword usage for analytics
      try {
        await supabase.rpc('track_keyword_usage', {
          p_keyword: keyword,
          p_profession: selectedProfessions.length > 0 ? selectedProfessions[0] : null,
          p_category_name: null
        });
      } catch (error) {
        console.error('Error tracking keyword usage:', error);
        // Don't show error to user, this is background analytics
      }
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <SubscriptionBanner currentTier={subscriptionTier} />
          
          <h1 className="text-3xl font-bold mb-6">Edit Your Profile</h1>
          
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Photo Section */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Profile Photo</h2>
                <ProfilePhotoUpload
                  currentPhotoUrl={photoUrl}
                  onPhotoChange={setPhotoUrl}
                  companyName={businessName}
                />
              </Card>

              {/* Profile Preview */}
              <DiggerProfileCard
                photoUrl={photoUrl}
                title={title}
                tagline={tagline}
                companyName={businessName}
                location={location}
                keywords={keywords}
                profession={selectedProfessions.join(', ')}
                
              />

              <form onSubmit={handleSubmit} className="space-y-6" id="profile-form">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                required
              />
            </div>

            {/* Optional Profile Title & Tagline */}
            <ProfileTitleTaglineEditor
              title={title}
              tagline={tagline}
              onTitleChange={setTitle}
              onTaglineChange={setTagline}
              companyName={businessName}
              profession={selectedProfessions.join(', ')}
              keywords={keywords}
            />

            <div className="space-y-2">
              <Label>Professions * <span className="text-xs text-muted-foreground">({selectedProfessions.length} selected)</span></Label>
              
              {profileCategory && (
                <p className="text-xs text-muted-foreground mb-2">
                  Showing professions for: <span className="font-medium text-foreground">{profileCategory}</span>
                </p>
              )}
              
              {/* Selected Professions Display */}
              {selectedProfessions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedProfessions.map((prof) => {
                    const pricing = getProfessionPricing(prof);
                    return (
                      <Badge key={prof} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                        <span className="capitalize">{prof}</span>
                        <span className="text-xs text-green-600 ml-1">${pricing.leadCost.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedProfessions(prev => prev.filter(p => p !== prof))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search professions..."
                  value={professionSearch}
                  onChange={(e) => setProfessionSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Professions Checkbox List */}
              <div className="border rounded-md max-h-[250px] overflow-y-auto bg-background">
                <div className="p-2 space-y-1">
                  {professionOptions
                    .filter(prof => prof.toLowerCase().includes(professionSearch.toLowerCase()))
                    .map((prof) => {
                      const isSelected = selectedProfessions.includes(prof);
                      const pricing = getProfessionPricing(prof);
                      return (
                        <label
                          key={prof}
                          htmlFor={`prof-${prof}`}
                          className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`prof-${prof}`}
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedProfessions(prev => 
                                  e.target.checked 
                                    ? [...prev, prof]
                                    : prev.filter(p => p !== prof)
                                );
                              }}
                              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <span className="cursor-pointer text-sm font-normal capitalize">
                              {prof}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {pricing.cpc && (
                              <span className="text-blue-600">CPC: ${pricing.cpc}</span>
                            )}
                            <span className="text-green-600 font-medium">Lead: ${pricing.leadCost.toFixed(2)}</span>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProfessionDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Custom
                </Button>
                {selectedProfessions.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProfessions([])}
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select one or more professions that match your services
              </p>
              
              {/* Add Custom Profession Dialog */}
              <Dialog open={showAddProfessionDialog} onOpenChange={setShowAddProfessionDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Profession</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="customProfession">Profession Name</Label>
                      <Input
                        id="customProfession"
                        value={customProfession}
                        onChange={(e) => setCustomProfession(e.target.value)}
                        placeholder="Enter your profession"
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        if (customProfession.trim()) {
                          setSelectedProfessions(prev => [...prev, customProfession.trim()]);
                          setCustomProfession("");
                          setShowAddProfessionDialog(false);
                          toast.success(`Added "${customProfession.trim()}" as profession`);
                        }
                      }}
                      disabled={!customProfession.trim()}
                    >
                      Add Profession
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                required
              />
            </div>

            {/* Location Preferences Section */}
            <Card className="p-4 border-2 border-primary/20 bg-primary/5">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Service Area Preferences
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define where you want to receive gig notifications
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="United States">🇺🇸 United States</option>
                    <option value="Canada">🇨🇦 Canada</option>
                    <option value="United Kingdom">🇬🇧 United Kingdom</option>
                    <option value="Australia">🇦🇺 Australia</option>
                    <option value="Germany">🇩🇪 Germany</option>
                    <option value="France">🇫🇷 France</option>
                    <option value="Spain">🇪🇸 Spain</option>
                    <option value="Italy">🇮🇹 Italy</option>
                    <option value="Mexico">🇲🇽 Mexico</option>
                    <option value="Brazil">🇧🇷 Brazil</option>
                    <option value="Other">🌍 Other</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationPreference"
                      value="zip_codes"
                      checked={locationPreferenceType === "zip_codes"}
                      onChange={(e) => setLocationPreferenceType(e.target.value as "zip_codes" | "radius")}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-normal">Specific Zip Codes</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationPreference"
                      value="radius"
                      checked={locationPreferenceType === "radius"}
                      onChange={(e) => setLocationPreferenceType(e.target.value as "zip_codes" | "radius")}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-normal">Radius from Zip Code</span>
                  </label>
                </div>

                {locationPreferenceType === "zip_codes" ? (
                  <div className="space-y-2">
                    <Label htmlFor="serviceZipCodes">Enter Zip Codes (comma-separated)</Label>
                    <Textarea
                      id="serviceZipCodes"
                      value={serviceZipCodes}
                      onChange={(e) => setServiceZipCodes(e.target.value)}
                      placeholder="e.g., 10001, 10002, 10003"
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter multiple zip codes separated by commas
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serviceRadiusCenter">Center Zip Code</Label>
                      <Input
                        id="serviceRadiusCenter"
                        value={serviceRadiusCenter}
                        onChange={(e) => setServiceRadiusCenter(e.target.value)}
                        placeholder="e.g., 10001"
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceRadiusMiles">Radius (miles)</Label>
                      <Input
                        id="serviceRadiusMiles"
                        type="number"
                        min="1"
                        max="500"
                        value={serviceRadiusMiles}
                        onChange={(e) => setServiceRadiusMiles(parseInt(e.target.value) || 25)}
                        placeholder="25"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </div>

            <div className="space-y-4 p-4 rounded-lg border bg-card">
              <div>
                <Label className="text-base font-semibold">Lead Volume Planning</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Help us understand your capacity so we can show you the right pricing tier
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedLeadVolume">Expected Leads</Label>
                  <Input
                    id="expectedLeadVolume"
                    type="number"
                    min="0"
                    value={expectedLeadVolume || ''}
                    onChange={(e) => setExpectedLeadVolume(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g., 25"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expectedLeadPeriod">Time Period</Label>
                  <select
                    id="expectedLeadPeriod"
                    value={expectedLeadPeriod}
                    onChange={(e) => setExpectedLeadPeriod(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="daily">Per Day</option>
                    <option value="weekly">Per Week</option>
                    <option value="monthly">Per Month</option>
                  </select>
                </div>
              </div>

              {expectedLeadVolume && expectedLeadPeriod && (
                <div className="p-3 bg-accent/30 rounded-md">
                  <p className="text-sm">
                    <span className="font-semibold">Your Expected Tier:</span>{' '}
                    {expectedLeadVolume < 10 ? (
                      <span className="text-blue-600">Free Tier (Standard pricing)</span>
                    ) : expectedLeadVolume < 50 ? (
                      <span className="text-purple-600">Pro Tier (Volume discount)</span>
                    ) : (
                      <span className="text-amber-600">Premium Tier (Best bulk pricing)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {expectedLeadPeriod === 'monthly' 
                      ? 'Based on your monthly volume'
                      : expectedLeadPeriod === 'weekly'
                      ? `~${Math.ceil(expectedLeadVolume * 4.33)} leads per month`
                      : `~${Math.ceil(expectedLeadVolume * 30)} leads per month`}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3" id="bio">
              <Label htmlFor="bio">About Your Services</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about your experience and expertise..."
                rows={4}
              />
              {keywords.length > 0 && bio && (
                <Card className="p-3 mt-2 bg-accent/30">
                  <p className="text-sm text-muted-foreground mb-2">Keyword matches in your bio:</p>
                  <p className="text-sm">
                    {highlightKeywords(bio).map((part, index) => (
                      <span
                        key={index}
                        className={part.isKeyword ? "bg-primary/20 text-primary font-semibold px-1 rounded" : ""}
                      >
                        {part.text}
                      </span>
                    ))}
                  </p>
                </Card>
              )}
              <BioGenerator 
                profession={selectedProfessions.join(', ')}
                currentBio={bio}
                onBioGenerated={setBio}
              />
            </div>

            <div id="pricing">
              <Label className="text-base font-semibold">Available for *</Label>
              <p className="text-sm text-muted-foreground mb-3">Select at least one pricing option</p>
              <div className="space-y-4">
                <label className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="pricingModel"
                    value="commission"
                    checked={pricingModel === "commission"}
                    onChange={(e) => setPricingModel(e.target.value)}
                    className="h-4 w-4 mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <span className="font-semibold">Fixed Price Contracts</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Volume-based lead pricing + 9%/5%/3% escrow processing fee (based on monthly lead volume)
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="pricingModel"
                    value="hourly"
                    checked={pricingModel === "hourly"}
                    onChange={(e) => setPricingModel(e.target.value)}
                    className="h-4 w-4 mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <span className="font-semibold">Time and Materials (Hourly)</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Volume-based lead pricing + Award fee based on tier + 9%/5%/3% escrow processing fee
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="pricingModel"
                    value="both"
                    checked={pricingModel === "both"}
                    onChange={(e) => setPricingModel(e.target.value)}
                    className="h-4 w-4 mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <span className="font-semibold">Both Models</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Volume-based lead pricing + Award fee varies by model + 9%/5%/3% escrow processing fee
                    </p>
                  </div>
                </label>
              </div>

            </div>

            <div className="space-y-2" id="keywords">
              <div className="flex items-center justify-between">
                <Label htmlFor="keywords">Keywords / Specialties</Label>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={keywords.length > 0 ? "default" : "secondary"}>
                    {keywords.length} {keywords.length === 1 ? "keyword" : "keywords"}
                  </Badge>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  ⚠️ Important: Lead Matching Criteria
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>You will only receive leads that contain your selected specialties.</strong> To maximize your lead opportunities, we recommend selecting all available specialty keywords related to your profession or creating your own custom keywords below.
                </p>
              </div>
              
              <Textarea
                id="keywords"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="Enter keywords separated by commas or semicolons (e.g., residential plumbing, emergency repairs, water heaters)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Add relevant keywords to improve matching with gigs. Use commas or semicolons to separate keywords.
              </p>
              
              {/* Keyword Suggestions */}
              {selectedProfessions.length > 0 && (
                <KeywordSuggestions
                  currentKeywords={keywords}
                  onAddKeyword={handleAddKeyword}
                  profession={selectedProfessions[0]}
                />
              )}
              
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Hourly Upcharge Display */}
            {(hourlyRateMin || hourlyRateMax) && (
              <div className="mt-6">
                <HourlyUpchargeDisplay
                  hourlyRateMin={hourlyRateMin}
                  hourlyRateMax={hourlyRateMax}
                  subscriptionTier={subscriptionTier}
                  variant="default"
                />
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Profile...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </form>
        </div>

        {/* Sidebar with Completion Widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {profileData && (
              <ProfileCompletionWidget
                profile={profileData}
                profileId={profileId}
                onNavigateToSection={(section) => {
                  const element = document.getElementById(section);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  </main>
  <Footer />
</div>
  );
};


export default EditDiggerProfile;
