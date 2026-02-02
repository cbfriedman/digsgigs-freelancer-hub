import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Tag, MapPin, Plus, Search, X, Sparkles, DollarSign, Award, Camera, User, Briefcase, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeywordSelector } from "@/components/KeywordSelector";
// Note: Using native radio inputs for pricing model selection to ensure stable controlled component behavior
import { BioGenerator } from "@/components/BioGenerator";
import { ProfileCompletionWidget } from "@/components/ProfileCompletionWidget";
import { getLeadTierDescription, INDUSTRY_PRICING, getLeadCostForIndustry, getIndustryCategory } from "@/config/pricing";
import { GOOGLE_CPC_KEYWORDS, getKeywordCPC } from "@/config/googleCpcKeywords";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ProfileTitleTaglineEditor } from "@/components/ProfileTitleTaglineEditor";
import { DiggerProfileCard } from "@/components/DiggerProfileCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getRegionsForCountry, getRegionLabel, ALL_COUNTRIES } from "@/config/locationData";
import { SafeProfessionSelector } from "@/components/SafeProfessionSelector";
import { useProfessions } from "@/hooks/useProfessions";
import { WorkSamplesUpload } from "@/components/WorkSamplesUpload";
import { CertificationsInput } from "@/components/CertificationsInput";

const EditDiggerProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { id: profileIdParam } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [selectedProfessionIds, setSelectedProfessionIds] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const { professions, getProfessionById, getLeadPriceForProfession, loading: professionsLoading } = useProfessions();
  const [pendingProfessionNames, setPendingProfessionNames] = useState<string[]>([]);
  
  // Helper to get lead price for a profession ID
  const getProfessionPricingById = (professionId: string) => {
    const profession = getProfessionById(professionId);
    if (!profession) {
      return { cpc: null, leadCost: 15 }; // Default to $15
    }
    const leadCost = getLeadPriceForProfession(professionId);
    // For display purposes, we can estimate CPC from lead cost (reverse calculation)
    const estimatedCpc = leadCost * 4; // Rough estimate
    return { cpc: estimatedCpc, leadCost };
  };
  
  // Get profession names from IDs for display/legacy compatibility
  const getProfessionNames = () => {
    return selectedProfessionIds
      .map(id => getProfessionById(id))
      .filter(Boolean)
      .map(p => p!.name);
  };
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [profileId, setProfileId] = useState<string>("");
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
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false); // Flag to prevent reload after update
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [stateProvince, setStateProvince] = useState<string>("");

  // Memoize regions for the selected country (service area)
  const availableRegions = useMemo(() => {
    return getRegionsForCountry(country);
  }, [country]);

  // Memoize regions for business location country
  const businessLocationRegions = useMemo(() => {
    return getRegionsForCountry(location);
  }, [location]);

  // Parse keywords from input
  const keywords = keywordsInput
    .split(/[,;]/)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  // Merge saved profile with current form state so completion widget updates live and can reach 100%
  const displayProfileForCompletion = useMemo(() => {
    if (!profileData) return null;
    return {
      ...profileData,
      bio: bio || profileData.bio,
      profile_image_url: photoUrl || profileData.profile_image_url,
      work_photos: workPhotos.length > 0 ? workPhotos : (profileData.work_photos || []),
      hourly_rate_min: hourlyRateMin ?? profileData.hourly_rate_min,
      hourly_rate_max: hourlyRateMax ?? profileData.hourly_rate_max,
      certifications: certifications.length > 0 ? certifications : (profileData.certifications || []),
    };
  }, [profileData, bio, photoUrl, workPhotos, hourlyRateMin, hourlyRateMax, certifications]);

  // Match pending profession names to IDs once professions are loaded
  useEffect(() => {
    if (pendingProfessionNames.length > 0 && professions.length > 0 && !professionsLoading) {
      const professionIds: string[] = [];
      pendingProfessionNames.forEach(profName => {
        const matchedProf = professions.find(p => 
          p.name.toLowerCase() === profName.toLowerCase()
        );
        if (matchedProf) {
          professionIds.push(matchedProf.id);
        }
      });
      if (professionIds.length > 0) {
        setSelectedProfessionIds(professionIds);
        setPendingProfessionNames([]); // Clear pending names
      }
    }
  }, [pendingProfessionNames, professions, professionsLoading]);

  useEffect(() => {
    // Don't reload if we're in the middle of updating
    if (isUpdating) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Support both URL params (/edit-digger-profile/:profileId) and query params (?profileId=xxx)
    // Read searchParams once per effect run to avoid dependency issues
    const profileIdFromQuery = searchParams.get('profileId');
    const profileIdFromUrl = profileIdParam || profileIdFromQuery;
    if (profileIdFromUrl) {
      setProfileId(profileIdFromUrl);
    }
    
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, profileIdParam]); // Removed searchParams from deps to prevent loop - read it inside effect instead

  const loadProfile = async () => {
    if (!user) return;

    // Get profileId from URL params or query params
    const profileIdFromUrl = profileIdParam || searchParams.get('profileId');

    try {
      let query = supabase
        .from("digger_profiles")
        .select("*")
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
        
        // Load profession assignments from digger_profession_assignments table
        const { data: assignments, error: assignmentsError } = await supabase
          .from('digger_profession_assignments')
          .select('profession_id')
          .eq('digger_profile_id', profile.id);
        
        if (assignmentsError) {
          console.error("Error loading profession assignments:", assignmentsError);
          // Fallback to old profession field if assignments don't exist
          const professionsList = profile.profession 
            ? profile.profession.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
            : [];
          // Store profession names to match later when professions are loaded
          setPendingProfessionNames(professionsList);
        } else {
          // Use profession IDs from assignments
          const professionIds = assignments?.map(a => a.profession_id) || [];
          setSelectedProfessionIds(professionIds);
        }
        
        // Parse location - it may be stored as "State, Country" format
        const storedLocation = profile.location || "";
        // Check if the stored location matches a known country
        const knownCountry = ALL_COUNTRIES.find(c => 
          storedLocation === c.name || storedLocation.endsWith(`, ${c.name}`)
        );
        
        if (knownCountry && storedLocation.includes(', ')) {
          // Location is in "State, Country" format
          const parts = storedLocation.split(', ');
          const countryPart = parts[parts.length - 1];
          const statePart = parts.slice(0, -1).join(', ');
          setLocation(countryPart);
          setStateProvince(statePart);
        } else if (knownCountry) {
          // Location is just a country name
          setLocation(storedLocation);
          setStateProvince("");
        } else {
          // Legacy location format or free-text
          setLocation(storedLocation);
          setStateProvince("");
        }
        
        // Load phone - if not set or "Not specified", try to get from profiles table
        let phoneToUse = profile.phone || "";
        if (!phoneToUse || phoneToUse.toLowerCase().includes('not specified')) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', user.id)
            .single();
          if (userProfile?.phone) {
            phoneToUse = userProfile.phone;
          }
        }
        setPhone(phoneToUse);
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
                // Load states if available
                if (profile.state) {
                  setSelectedStates(profile.state.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0));
                }
                
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
        setWorkPhotos(profile.work_photos || []);
        setCertifications(profile.certifications || []);
        setProfileData(profile);
        
        // Category loading removed - using new taxonomy system with profession assignments
      }
    } catch (error: any) {
      // Error logging - consider using proper error tracking service in production
      if (import.meta.env.DEV) {
      console.error("Error loading profile:", error);
      }
      toast.error("Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  // Phone number validation helper
  const isValidPhoneNumber = (phoneNumber: string): boolean => {
    // Check for invalid prefixes like "not specified"
    if (phoneNumber.toLowerCase().includes('not specified') || 
        phoneNumber.toLowerCase().includes('n/a') ||
        phoneNumber.toLowerCase().includes('none')) {
      return false;
    }
    // Remove all non-digit characters for validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    // Valid phone numbers should have 10-15 digits (supports international)
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileId) return;

    // Only business name and phone are truly required - allow incomplete profiles
    if (!businessName) {
      toast.error("Please enter your business name");
      return;
    }

    // Validate phone number format only if provided
    if (phone && !isValidPhoneNumber(phone)) {
      toast.error("Please enter a valid phone number (10-15 digits)");
      return;
    }

    // Get profession names for legacy field (backward compatibility)
    const professionNames = selectedProfessionIds
      .map(id => getProfessionById(id))
      .filter(Boolean)
      .map(p => p!.name);
    const professionString = professionNames.join(', ');

    setLoading(true);
    setIsUpdating(true); // Set flag to prevent useEffect from reloading

    try {
      // Calculate lead tier description based on profession names
      const leadTierDescription = getLeadTierDescription(professionNames);

      // Parse location preferences
      const zipCodesArray = locationPreferenceType === "zip_codes" && serviceZipCodes
        ? serviceZipCodes.split(/[,;]/).map(z => z.trim()).filter(z => z.length > 0)
        : null;

      // Build business location string - include state/province if selected
      let businessLocation = location;
      if (stateProvince && location && location !== "Other") {
        businessLocation = `${stateProvince}, ${location}`;
      }

      // Service area states for the state column
      const serviceAreaStates = selectedStates.length > 0 ? selectedStates.join(', ') : null;

      const { error } = await supabase
        .from("digger_profiles")
        .update({
          business_name: businessName,
          company_name: businessName,
          profession: professionString,
          location: businessLocation,
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
          state: serviceAreaStates,
          work_photos: workPhotos.length > 0 ? workPhotos : null,
          certifications: certifications.length > 0 ? certifications : null,
          hourly_rate_min: hourlyRateMin,
          hourly_rate_max: hourlyRateMax,
        })
        .eq("id", profileId);

      if (error) throw error;

      // Update profession assignments
      // First, delete existing assignments
      const { error: deleteAssignmentsError } = await supabase
        .from('digger_profession_assignments')
        .delete()
        .eq('digger_profile_id', profileId);

      if (deleteAssignmentsError) throw deleteAssignmentsError;

      // Then, insert new assignments
      const assignments = selectedProfessionIds.map((professionId, index) => ({
        digger_profile_id: profileId,
        profession_id: professionId,
        is_primary: index === 0 // First profession is primary
      }));

      const { error: insertAssignmentsError } = await supabase
        .from('digger_profession_assignments')
        .insert(assignments);

      if (insertAssignmentsError) throw insertAssignmentsError;

      toast.success("Profile saved successfully!");
      
      // Navigate immediately without delay to prevent loop
      navigate(`/digger/${profileId}`, { replace: true });
    } catch (error: any) {
      // Error logging - consider using proper error tracking service in production
      if (import.meta.env.DEV) {
      console.error("Error updating profile:", error);
      }
      toast.error(error.message || "Failed to update profile");
      setIsUpdating(false); // Reset flag on error so user can try again
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
          p_profession: selectedProfessionIds.length > 0 ? getProfessionById(selectedProfessionIds[0])?.name || null : null,
          p_category_name: null
        });
      } catch (error) {
        // Error logging - consider using proper error tracking service in production
        // Don't show error to user, this is background analytics
        if (import.meta.env.DEV) {
          console.error('Error tracking keyword usage:', error);
        }
      }
    }
  };

  if (loadingProfile) {
    return (
      <PageLayout maxWidth="wide">
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="wide">
      <div className="animate-fade-in-up">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Edit Your Profile</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Complete your profile to attract more clients and receive relevant leads
          </p>
        </div>
          
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Photo Section */}
            <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow" id="photos">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Profile Photo</CardTitle>
                    <CardDescription>Add a professional photo to build trust</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ProfilePhotoUpload
                  currentPhotoUrl={photoUrl}
                  onPhotoChange={setPhotoUrl}
                  companyName={businessName}
                />
              </CardContent>
            </Card>

            {/* Work Samples Section */}
            <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow" id="work-samples">
              <CardHeader className="pb-4 bg-gradient-to-r from-accent/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Camera className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Work Samples</CardTitle>
                    <CardDescription>Showcase your best work with photos of completed projects</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Add at least 3 photos to complete this section and attract more clients.
                </p>
                <WorkSamplesUpload
                  currentPhotos={workPhotos}
                  onPhotosChange={setWorkPhotos}
                  maxPhotos={10}
                />
              </CardContent>
            </Card>

              {/* Profile Preview */}
              <DiggerProfileCard
                photoUrl={photoUrl}
                title={title}
                tagline={tagline}
                companyName={businessName}
                location={location}
                keywords={keywords}
                profession={getProfessionNames().join(', ')}
                
              />

            {/* Main Form Card */}
            <Card className="overflow-hidden border-border/50" id="profile-form">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Business Information</CardTitle>
                    <CardDescription>Tell clients about your business and services</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-sm font-medium">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your business name"
                      required
                      className="border-border/50 focus:border-primary"
                    />
                  </div>

            {/* Optional Profile Title & Tagline */}
            <ProfileTitleTaglineEditor
              title={title}
              tagline={tagline}
              onTitleChange={setTitle}
              onTaglineChange={setTagline}
              companyName={businessName}
              profession={getProfessionNames().join(', ')}
              keywords={keywords}
            />

            <div className="space-y-2">
              <Label>Professions * <span className="text-xs text-muted-foreground">({selectedProfessionIds.length} selected)</span></Label>
              
              <SafeProfessionSelector
                selectedProfessionIds={selectedProfessionIds}
                onProfessionsChange={setSelectedProfessionIds}
                maxSelections={10}
              />
              
              {/* Selected Keywords - shown right after professions */}
              {keywords.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium text-muted-foreground">Selected Keywords ({keywords.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                        <span>{keyword}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newKeywords = keywords.filter((_, i) => i !== index);
                            setKeywordsInput(newKeywords.join(', '));
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium">Business Location (Country) *</Label>
                    <select
                      id="location"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setStateProvince(""); // Clear state when country changes
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      required
                    >
                      <option value="">Select your country...</option>
                      {ALL_COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      This is the country where your business is registered
                    </p>
                  </div>

                  {/* State/Province Field - Shows when country has regions */}
                  {location && location !== "Other" && businessLocationRegions.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="stateProvince" className="text-sm font-medium">{getRegionLabel(location)}</Label>
                      <select
                        id="stateProvince"
                        value={stateProvince}
                        onChange={(e) => setStateProvince(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Select {getRegionLabel(location).toLowerCase()}...</option>
                        {businessLocationRegions.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Location Preferences Section */}
                  <div className="p-5 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Service Area Preferences
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Define where you want to receive gig notifications
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                        <select
                          id="country"
                          value={country}
                          onChange={(e) => {
                            setCountry(e.target.value);
                            setSelectedStates([]); // Clear states when country changes
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="">Select a country...</option>
                          <option value="All Countries">🌐 All Countries</option>
                          {ALL_COUNTRIES.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                {/* State/Province Multi-Select - Always visible for supported countries, but not for "All Countries" */}
                {country && country !== "Other" && country !== "All Countries" && country !== "" && availableRegions.length > 0 && (
                  <div className="space-y-2 border-l-4 border-primary pl-4 bg-primary/5 p-4 rounded-r-lg">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {getRegionLabel(country)} - Select Your Service Areas
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Select the states/regions where you provide services
                    </p>
                    <div className="border rounded-md max-h-[200px] overflow-y-auto bg-background">
                      <div className="p-2 space-y-1">
                        <label className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer border-b">
                          <input
                            type="checkbox"
                            checked={selectedStates.length === availableRegions.length && availableRegions.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStates([...availableRegions]);
                              } else {
                                setSelectedStates([]);
                              }
                            }}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-semibold">Select All</span>
                        </label>
                        {availableRegions.map((state) => (
                          <label
                            key={state}
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStates.includes(state)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStates(prev => [...prev, state]);
                                } else {
                                  setSelectedStates(prev => prev.filter(s => s !== state));
                                }
                              }}
                              className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <span className="text-sm">{state}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {selectedStates.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedStates.slice(0, 5).map((state) => (
                          <Badge key={state} variant="secondary" className="text-xs">
                            {state}
                          </Badge>
                        ))}
                        {selectedStates.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{selectedStates.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        // Allow only digits, spaces, dashes, parentheses, and plus sign
                        const sanitized = e.target.value.replace(/[^\d\s\-()+ ]/g, '');
                        setPhone(sanitized);
                      }}
                      placeholder="(555) 123-4567"
                      required
                      pattern="[\d\s\-\(\)+ ]{10,20}"
                      className="border-border/50 focus:border-primary"
                    />
                    {phone && !isValidPhoneNumber(phone) && (
                      <p className="text-sm text-destructive">Please enter a valid phone number (10-15 digits)</p>
                    )}
                  </div>


                  {/* AI-Powered Bio Generator */}
                  <div className="p-5 rounded-xl border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-accent/10">
                        <Sparkles className="h-4 w-4 text-accent" />
                      </div>
                      <span className="font-semibold text-sm">AI-Powered Bio Generator</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Let AI generate a professional bio based on your profession and keywords
                    </p>
                    <BioGenerator 
                      profession={getProfessionNames().join(', ')}
                      currentBio={bio}
                      onBioGenerated={setBio}
                    />
                  </div>


                  <div id="pricing" className="space-y-3">
                    <Label className="text-base font-semibold">Available for *</Label>
                    <p className="text-sm text-muted-foreground">Select at least one pricing option</p>
                    <div className="space-y-3">
                      <label className={`flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${pricingModel === "commission" ? "border-primary bg-primary/5" : "border-border/50 bg-card hover:border-primary/30"}`}>
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
                            Volume-based lead pricing + 9%/5%/3% escrow processing fee
                          </p>
                        </div>
                      </label>

                      <label className={`flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${pricingModel === "hourly" ? "border-primary bg-primary/5" : "border-border/50 bg-card hover:border-primary/30"}`}>
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
                            Volume-based lead pricing + Award fee based on tier
                          </p>
                        </div>
                      </label>

                      <label className={`flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${pricingModel === "both" ? "border-primary bg-primary/5" : "border-border/50 bg-card hover:border-primary/30"}`}>
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
                            Flexible pricing based on project requirements
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Hourly Rate Range Section */}
                  <div className="space-y-4" id="hourly-rate">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-green-500/10">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <Label className="text-base font-semibold">Hourly Rate Range</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Set your hourly rate range to display on your profile
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hourlyRateMin" className="text-sm font-medium">Minimum Rate ($)</Label>
                        <Input
                          id="hourlyRateMin"
                          type="number"
                          min="0"
                          value={hourlyRateMin || ''}
                          onChange={(e) => setHourlyRateMin(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="e.g., 50"
                          className="border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hourlyRateMax" className="text-sm font-medium">Maximum Rate ($)</Label>
                        <Input
                          id="hourlyRateMax"
                          type="number"
                          min="0"
                          value={hourlyRateMax || ''}
                          onChange={(e) => setHourlyRateMax(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="e.g., 150"
                          className="border-border/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Certifications Section */}
                  <div className="space-y-4" id="certifications">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <Award className="h-4 w-4 text-amber-600" />
                      </div>
                      <Label className="text-base font-semibold">Certifications & Credentials</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add your professional certifications to build trust with potential clients
                    </p>
                    <CertificationsInput
                      certifications={certifications}
                      onCertificationsChange={setCertifications}
                    />
                  </div>

                  <div className="space-y-3" id="keywords">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10">
                          <Tag className="h-4 w-4 text-blue-600" />
                        </div>
                        <Label htmlFor="keywords" className="text-base font-semibold">Keywords / Specialties</Label>
                      </div>
                      <Badge variant="default" className="bg-primary text-primary-foreground px-3 py-1">
                        {keywords.length} Selected
                      </Badge>
                    </div>
                    
                    <div className="p-4 rounded-xl border-2 border-blue-500/20 bg-blue-500/5 space-y-2">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        ⚠️ Important: Lead Matching Criteria
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>You will only receive leads that contain your selected specialties.</strong> Select all relevant keywords to maximize opportunities.
                      </p>
                    </div>
                    
                    <Textarea
                      id="keywords"
                      value={keywordsInput}
                      onChange={(e) => setKeywordsInput(e.target.value)}
                      placeholder="Enter keywords separated by commas (e.g., residential plumbing, emergency repairs)"
                      rows={3}
                      className="border-border/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add relevant keywords to improve matching with gigs
                    </p>
                  </div>


                  <Button type="submit" disabled={loading} size="lg" className="w-full bg-primary hover:bg-primary/90">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save and Continue"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar with Completion Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {displayProfileForCompletion && (
                <ProfileCompletionWidget
                  profile={displayProfileForCompletion}
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
    </PageLayout>
  );
};


export default EditDiggerProfile;
