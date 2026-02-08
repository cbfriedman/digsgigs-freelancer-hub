import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Loader2, MapPin, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateKeywordSuggestions } from "@/utils/keywordSuggestions";
import { getRegionsForCountry, getRegionLabel } from "@/config/locationData";
import { GOOGLE_CPC_KEYWORDS } from "@/config/googleCpcKeywords";
import { SafeProfessionSelector } from "./SafeProfessionSelector";
import { useProfessions } from "@/hooks/useProfessions";

// Helper function to look up CPC and calculate lead cost for a keyword
const getKeywordPricing = (keyword: string): { cpc: number | null; leadCost: number | null } => {
  const keywordLower = keyword.toLowerCase();
  const keywordWords = keywordLower.split(' ');
  
  // 1. Try exact match first
  for (const industry of GOOGLE_CPC_KEYWORDS) {
    for (const kw of industry.keywords) {
      if (kw.keyword.toLowerCase() === keywordLower) {
        const leadCost = Math.ceil((kw.cpc * 0.25) * 2) / 2;
        return { cpc: kw.cpc, leadCost };
      }
    }
  }
  
  // 2. Try partial match - keyword contains or is contained in database keyword
  let bestMatch: { cpc: number; matchScore: number } | null = null;
  
  for (const industry of GOOGLE_CPC_KEYWORDS) {
    for (const kw of industry.keywords) {
      const dbKeywordLower = kw.keyword.toLowerCase();
      const dbWords = dbKeywordLower.split(' ');
      
      // Check for word overlap
      const matchingWords = keywordWords.filter(w => 
        dbWords.some(dbw => dbw.includes(w) || w.includes(dbw))
      );
      
      if (matchingWords.length > 0) {
        const matchScore = matchingWords.length / Math.max(keywordWords.length, dbWords.length);
        if (!bestMatch || matchScore > bestMatch.matchScore) {
          bestMatch = { cpc: kw.cpc, matchScore };
        }
      }
    }
  }
  
  if (bestMatch && bestMatch.matchScore >= 0.3) {
    const leadCost = Math.ceil((bestMatch.cpc * 0.25) * 2) / 2;
    return { cpc: bestMatch.cpc, leadCost };
  }
  
  // 3. Fall back to industry average based on common terms
  const industryKeywords: Record<string, string[]> = {
    'legal': ['law', 'lawyer', 'attorney', 'legal'],
    'accounting': ['accounting', 'bookkeeping', 'tax', 'cpa', 'accountant'],
    'business': ['business', 'consulting', 'services', 'strategy'],
    'financial': ['financial', 'finance', 'investment', 'insurance'],
    'medical': ['medical', 'health', 'doctor', 'therapy', 'therapist'],
  };
  
  for (const [industryType, terms] of Object.entries(industryKeywords)) {
    if (terms.some(term => keywordLower.includes(term))) {
      // Find average CPC for this industry type
      const matchingIndustries = GOOGLE_CPC_KEYWORDS.filter(ind => 
        terms.some(term => ind.industry.toLowerCase().includes(term))
      );
      
      if (matchingIndustries.length > 0) {
        const avgCpc = Math.round(
          matchingIndustries.reduce((sum, ind) => sum + ind.averageCpc, 0) / matchingIndustries.length
        );
        const leadCost = Math.ceil((avgCpc * 0.25) * 2) / 2;
        return { cpc: avgCpc, leadCost };
      }
    }
  }
  
  return { cpc: null, leadCost: null };
};

export const CategoryBrowserWithDescription = () => {
  const { user, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingProfileId = searchParams.get('profileId');
  const { professions, getProfessionById } = useProfessions();
  const [selectedProfessionIds, setSelectedProfessionIds] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [newKeyword, setNewKeyword] = useState("");
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [locationPreferenceType, setLocationPreferenceType] = useState<"zip_codes" | "radius">("zip_codes");
  const [serviceZipCodes, setServiceZipCodes] = useState("");
  const [serviceRadiusCenter, setServiceRadiusCenter] = useState("");
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState<number>(25);
  const [country, setCountry] = useState("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [city, setCity] = useState("");
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [formStep, setFormStep] = useState<1 | 2>(2); // Step 1 (location) removed - go directly to professions
  const [isCreatingAdditionalProfile, setIsCreatingAdditionalProfile] = useState(false);

  // Fetch phone from profiles table on mount
  useEffect(() => {
    const fetchUserPhone = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();
      if (!error && data?.phone) {
        setUserPhone(data.phone);
      }
    };
    fetchUserPhone();
  }, [user]);

  // Reset state when country changes
  useEffect(() => {
    setSelectedState("");
  }, [country]);

  // When editing existing profile, skip to step 2
  useEffect(() => {
    if (existingProfileId) setFormStep(2);
  }, [existingProfileId]);

  // Load existing profile's location when editing
  useEffect(() => {
    if (!existingProfileId || !user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('digger_profiles')
        .select('location, country, state, service_zip_codes, service_radius_center, service_radius_miles')
        .eq('id', existingProfileId)
        .single();
      if (error || !data) return;
      setCountry(data.country || '');
      setServiceZipCodes(Array.isArray(data.service_zip_codes) ? data.service_zip_codes.join(', ') : (data.service_zip_codes || ''));
      setServiceRadiusCenter(data.service_radius_center || '');
      setServiceRadiusMiles(data.service_radius_miles ?? 25);
      if (data.location && data.location !== 'Not specified') {
        const parts = data.location.split(',').map((p: string) => p.trim()).filter(Boolean);
        const regions = data.country ? getRegionsForCountry(data.country) : [];
        if (data.state) {
          setSelectedState(data.state);
        } else if (parts.length >= 2 && regions.length > 0) {
          const possibleStates = parts.slice(1, -1).filter((s: string) => regions.includes(s));
          setSelectedState(possibleStates[0] || '');
        }
        const firstPart = parts[0];
        if (firstPart && firstPart !== data.country && !regions.includes(firstPart)) {
          setCity(firstPart);
        }
      } else if (data.state) {
        setSelectedState(data.state);
      }
    };
    load();
  }, [existingProfileId, user]);

  // When creating an additional profile (no existingProfileId), pre-fill location and skip country step
  useEffect(() => {
    if (existingProfileId || !user || country) return;
    const loadFirstProfile = async () => {
      const { data: profiles, error } = await supabase
        .from('digger_profiles')
        .select('location, country, state, service_zip_codes, service_radius_center, service_radius_miles')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      if (error || !profiles?.length) return;
      setIsCreatingAdditionalProfile(true);
      const p = profiles[0];
      setCountry(p.country || '');
      setServiceZipCodes(Array.isArray(p.service_zip_codes) ? p.service_zip_codes.join(', ') : (p.service_zip_codes || ''));
      setServiceRadiusCenter(p.service_radius_center || '');
      setServiceRadiusMiles(p.service_radius_miles ?? 25);
      if (p.location && p.location !== 'Not specified') {
        const parts = p.location.split(',').map((x: string) => x.trim()).filter(Boolean);
        const regions = p.country ? getRegionsForCountry(p.country) : [];
        if (p.state) {
          setSelectedState(p.state);
        } else if (parts.length >= 2 && regions.length > 0) {
          const possibleStates = parts.slice(1, -1).filter((s: string) => regions.includes(s));
          setSelectedState(possibleStates[0] || '');
        }
        const firstPart = parts[0];
        if (firstPart && firstPart !== p.country && !regions.includes(firstPart)) {
          setCity(firstPart);
        }
      } else if (p.state) {
        setSelectedState(p.state);
      }
      // Skip location step - user doesn't need to select country; use inherited from first profile
      setFormStep(2);
    };
    loadFirstProfile();
  }, [user, existingProfileId]);

  // Auto-generate profile name from selected professions
  useEffect(() => {
    if (selectedProfessionIds.length > 0 && !existingProfileId) {
      const selectedProfessions = selectedProfessionIds
        .map(id => getProfessionById(id))
        .filter(Boolean)
        .map(p => p!.name);
      
      if (selectedProfessions.length === 1) {
        setProfileName(selectedProfessions[0]);
      } else if (selectedProfessions.length > 1) {
        // Use first profession as base name
        setProfileName(selectedProfessions[0]);
      }
    }
  }, [selectedProfessionIds, existingProfileId, getProfessionById]);

  const handleContinue = async () => {
    // Description is optional - if empty, generate keywords from selected professions
    const selectedProfessionNames = selectedProfessionIds
      .map(id => getProfessionById(id))
      .filter(Boolean)
      .map(p => p!.name);
    const descriptionText = description.trim() || selectedProfessionNames.join(', ').trim();

    setIsProcessing(true);

    try {
      // Try AI-powered edge function with 10-second timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const edgeFunctionPromise = invokeEdgeFunction<{ keywords?: string[] }>(
        supabase,
        'suggest-keywords-from-description',
        { body: { description: descriptionText } }
      );

      const data = await Promise.race([edgeFunctionPromise, timeoutPromise]) as { keywords?: string[] } | undefined;

      if (data?.keywords && data.keywords.length > 0) {
        setSuggestedKeywords(data.keywords);
        setSelectedKeywords(new Set(data.keywords));
        toast.success(`AI found ${data.keywords.length} relevant keywords!`);
        return;
      }
    } catch (error: any) {
      console.log("Edge function failed, using local keyword suggestions:", error?.message ?? error);
      
      // Fallback to local keyword generation
      const categoryToprofession: Record<string, string> = {
        "Construction & Home Services": "contractor",
        "Legal Services": "lawyer",
        "Medical & Healthcare": "consultant",
        "Automotive Services": "mechanic",
        "Cleaning & Maintenance": "cleaner",
        "Technology Services": "designer",
        "Business Services": "consultant",
        "Event Services": "photographer",
        "Investors": "angel investor",
        "Credit Repair": "credit repair specialist",
        "Tax Relief Services": "tax relief specialist"
      };

      // Use first selected profession for keyword generation
      const firstProfession = selectedProfessionIds.length > 0 
        ? getProfessionById(selectedProfessionIds[0])
        : null;
      const professionName = firstProfession?.name.toLowerCase() || "contractor";
      const localKeywords = generateKeywordSuggestions(professionName, []);

      if (localKeywords.length > 0) {
        setSuggestedKeywords(localKeywords);
        setSelectedKeywords(new Set(localKeywords));
        toast.success(`Found ${localKeywords.length} relevant keywords from our database!`);
      } else {
        toast.error("No keywords found. Please try a more detailed description.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate description placeholder from selected professions
  const getDescriptionPlaceholder = () => {
    if (selectedProfessionIds.length === 0) {
      return "Select professions first, then describe your specific services, expertise, and specializations...";
    }
    const selectedProfessions = selectedProfessionIds
      .map(id => getProfessionById(id))
      .filter(Boolean)
      .map(p => p!.name);
    return `Describe your expertise in ${selectedProfessions.join(', ')}...`;
  };

  // AI-powered description enhancement (works with or without existing text; uses selected professions)
  const handleEnhanceDescription = async () => {
    if (selectedProfessionIds.length === 0) {
      toast.error("Please select at least one profession first");
      return;
    }

    setIsEnhancingDescription(true);
    try {
      const selectedProfessionNames = selectedProfessionIds
        .map(id => getProfessionById(id))
        .filter(Boolean)
        .map(p => p!.name);

      const descriptionToSend = description.trim();
      const data = await invokeEdgeFunction<{ enhancedDescription?: string; error?: string }>(
        supabase,
        'enhance-gig-description',
        {
          body: {
            description: descriptionToSend || undefined,
            labels: selectedProfessionNames.join(', '),
            professions: selectedProfessionNames,
          },
        }
      );

      if (data?.enhancedDescription) {
        setDescription(data.enhancedDescription);
        toast.success("Description enhanced with AI!");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      console.error("Failed to enhance description:", error);
      toast.error(error?.message || "Failed to enhance description. Please try again.");
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  return (
    <Card className="w-full overflow-x-hidden">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <CardTitle className="text-lg sm:text-xl">
            Browse Categories
          </CardTitle>
        </div>
        {selectedProfessionIds.length > 0 && !existingProfileId && formStep === 2 && (
          <div className="mt-2 p-3 sm:p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm sm:text-sm font-medium text-primary break-words">
              Creating Profile: <span className="font-bold">{profileName || 'Enter name below'}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedProfessionIds.length} profession{selectedProfessionIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
        <CardDescription>
          Select your professions and describe your specialties
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Professions, keywords, etc. (location step removed) */}
        {((existingProfileId) || formStep === 2) && (
        <>
        {/* Profession Selection */}
        <div className="space-y-3">
          <Label>Select Your Professions *</Label>
          <SafeProfessionSelector
            selectedProfessionIds={selectedProfessionIds}
            onProfessionsChange={setSelectedProfessionIds}
            maxSelections={10}
          />
        </div>


        {/* Specialty Description */}
        {selectedProfessionIds.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="description">Describe Your Specialties</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={getDescriptionPlaceholder()}
              className="min-h-[150px] bg-background text-base sm:text-sm"
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <p className="text-sm text-muted-foreground flex-1">
                Be specific about your services and expertise. You can leave the box blank and click &quot;Enhance with AI&quot; to generate a description from your selected professions.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnhanceDescription}
                disabled={isEnhancingDescription || selectedProfessionIds.length === 0}
                className="shrink-0 w-full sm:w-auto min-h-[44px] sm:min-h-0 touch-manipulation"
              >
                {isEnhancingDescription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Save and Continue / Save and Later Buttons - Always visible when professions selected */}
        {selectedProfessionIds.length > 0 && !suggestedKeywords.length && (
          <div className="space-y-4">
            {description && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">Next Steps</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your description will be used to match you with relevant leads for your selected professions.
                The more specific you are, the better your matches will be.
              </p>
            </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 min-h-[44px] sm:min-h-0 touch-manipulation" 
                size="lg"
                onClick={handleContinue}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Save and Continue'
                )}
              </Button>
            </div>
            {!description.trim() && (
              <p className="text-xs text-muted-foreground text-center">
                Add a description for better keyword suggestions.
              </p>
            )}
          </div>
        )}

        {/* Selected Keywords Display */}
        {suggestedKeywords.length > 0 && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
              <h4 className="font-semibold mb-3 text-sm sm:text-base">Selected Keywords ({suggestedKeywords.length})</h4>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                Click keywords to deselect them. Selected keywords have a checkmark and colored background. Click the X to remove them entirely.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords.map((keyword, index) => {
                  const isSelected = selectedKeywords.has(keyword);
                  const { cpc, leadCost } = getKeywordPricing(keyword);
                  return (
                    <div
                      key={index}
                      className={`group relative flex items-center gap-2 px-3 py-2 sm:py-1.5 pr-8 rounded-md text-sm cursor-pointer transition-all touch-manipulation min-h-[44px] sm:min-h-0 ${
                        isSelected
                          ? 'bg-primary/10 border-2 border-primary text-primary font-medium'
                          : 'bg-background border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 active:border-primary/50'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedKeywords);
                        if (isSelected) {
                          newSelected.delete(keyword);
                        } else {
                          newSelected.add(keyword);
                        }
                        setSelectedKeywords(newSelected);
                      }}
                    >
                      {isSelected && <span className="text-base sm:text-sm">✓</span>}
                      <span className="break-words">{keyword}</span>
                      <button
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 sm:p-0.5 rounded hover:bg-destructive/20 active:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors touch-manipulation min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newKeywords = suggestedKeywords.filter((k) => k !== keyword);
                          setSuggestedKeywords(newKeywords);
                          const newSelected = new Set(selectedKeywords);
                          newSelected.delete(keyword);
                          setSelectedKeywords(newSelected);
                        }}
                        title="Remove keyword"
                      >
                        <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {/* Keyword Help Text */}
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Select from the available keywords above. Need a specific keyword? Contact support to request it.
              </p>
            </div>
            
            {/* Profile Name Input */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="profile-name">Profile Name <span className="text-destructive">*</span></Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g., My Design Services, Web Development"
                className="w-full min-h-[44px] sm:min-h-0 text-base sm:text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter a name for this profile. This will help you organize multiple profiles.
              </p>
            </div>

            {/* Location Preferences Section */}
            <Card className="p-3 sm:p-4 border-2 border-primary/20 bg-primary/5 mt-4 overflow-x-hidden">
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

                {/* Country - Required */}
                <div className="space-y-2">
                  <Label htmlFor="country_browser" className="flex items-center gap-1">
                    Country <span className="text-destructive font-semibold">*</span>
                    <span className="text-xs text-destructive">(required)</span>
                  </Label>
                  <select
                    id="country_browser"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`flex h-12 sm:h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background touch-manipulation ${!country ? 'border-destructive/50' : 'border-input'}`}
                  >
                    <option value="">Select a country...</option>
                    <option value="All Countries">🌐 All Countries</option>
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

                {/* State/Province - Required (when country has regions and not "All Countries") */}
                {country && country !== "All Countries" && getRegionsForCountry(country).length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="state_browser" className="flex items-center gap-1">
                      {getRegionLabel(country)} / Territory <span className="text-destructive font-semibold">*</span>
                    </Label>
                    <select
                      id="state_browser"
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className={`flex h-12 sm:h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background touch-manipulation ${!selectedState ? 'border-destructive/50' : 'border-input'}`}
                    >
                      <option value="">Select a {getRegionLabel(country).toLowerCase()}...</option>
                      {getRegionsForCountry(country).map((region) => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* City - Optional */}
                {country && (
                  <div className="space-y-2">
                    <Label htmlFor="city_browser">City <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      id="city_browser"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g., Los Angeles"
                      className="bg-background min-h-[44px] sm:min-h-0 text-base sm:text-sm"
                    />
                  </div>
                )}

                {/* Separator */}
                {country && (
                  <div className="border-t border-border pt-4 mt-4">
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">
                      Zip Code Options <span className="text-xs">(optional)</span>
                    </Label>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 min-h-[44px] sm:min-h-0 touch-manipulation">
                        <input 
                          type="radio" 
                          name="locationPreferenceBrowser"
                          value="zip_codes" 
                          id="zip_codes_browser" 
                          checked={locationPreferenceType === "zip_codes"}
                          onChange={() => setLocationPreferenceType("zip_codes")}
                          className="h-5 w-5 sm:h-4 sm:w-4"
                        />
                        <Label htmlFor="zip_codes_browser" className="cursor-pointer font-normal flex-1 py-2 sm:py-0">
                          Specific Zip Codes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 min-h-[44px] sm:min-h-0 touch-manipulation">
                        <input 
                          type="radio" 
                          name="locationPreferenceBrowser"
                          value="radius" 
                          id="radius_browser" 
                          checked={locationPreferenceType === "radius"}
                          onChange={() => setLocationPreferenceType("radius")}
                          className="h-5 w-5 sm:h-4 sm:w-4"
                        />
                        <Label htmlFor="radius_browser" className="cursor-pointer font-normal flex-1 py-2 sm:py-0">
                          Radius from Zip Code
                        </Label>
                      </div>
                    </div>

                    {locationPreferenceType === "zip_codes" ? (
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="serviceZipCodes">Enter Zip Codes (comma-separated)</Label>
                        <Textarea
                          id="serviceZipCodes"
                          value={serviceZipCodes}
                          onChange={(e) => setServiceZipCodes(e.target.value)}
                          placeholder="e.g., 10001, 10002, 10003"
                          rows={3}
                          className="resize-none min-h-[100px] sm:min-h-0 text-base sm:text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter multiple zip codes separated by commas
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor="serviceRadiusCenter">Center Zip Code</Label>
                          <Input
                            id="serviceRadiusCenter"
                            value={serviceRadiusCenter}
                            onChange={(e) => setServiceRadiusCenter(e.target.value)}
                            placeholder="e.g., 10001"
                            maxLength={10}
                            className="min-h-[44px] sm:min-h-0"
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
                            className="min-h-[44px] sm:min-h-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                className="flex-1 w-full min-h-[44px] sm:min-h-0 touch-manipulation" 
                size="lg"
                onClick={async () => {
                  if (!user?.id) {
                    toast.error("You must be logged in to save your profile");
                    return;
                  }

                  if (selectedProfessionIds.length === 0) {
                    toast.error("Please select at least one profession before continuing");
                    return;
                  }

                  if (!profileName.trim()) {
                    toast.error("Please enter a profile name");
                    return;
                  }

                  // Validate country and state
                  if (!country) {
                    toast.error("Please select a country");
                    return;
                  }

                  const regions = getRegionsForCountry(country);
                  if (regions.length > 0 && !selectedState) {
                    toast.error(`Please select at least one ${getRegionLabel(country).toLowerCase()}`);
                    return;
                  }

                  const selected = Array.from(selectedKeywords);
                  setIsProcessing(true);

                  try {
                    // Check if we're editing an existing profile or creating new
                    if (existingProfileId) {
                      // UPDATE existing profile — keep location thoroughly
                      const zipCodesArray = locationPreferenceType === "zip_codes" && serviceZipCodes
                        ? serviceZipCodes.split(/[,;]/).map(z => z.trim()).filter(z => z.length > 0)
                        : null;
                      const locationParts: string[] = [];
                      if (city.trim()) locationParts.push(city.trim());
                      if (selectedState) locationParts.push(selectedState);
                      if (country) locationParts.push(country);
                      const locationString = locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';

                      const { error: updateError } = await supabase
                        .from('digger_profiles')
                        .update({
                          keywords: selected,
                          profile_name: profileName.trim(),
                          location: locationString,
                          service_zip_codes: zipCodesArray,
                          service_radius_center: locationPreferenceType === "radius" ? serviceRadiusCenter || null : null,
                          service_radius_miles: locationPreferenceType === "radius" ? serviceRadiusMiles : null,
                          country: country,
                          state: selectedState || null,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingProfileId);

                      if (updateError) throw updateError;

                      // Update profession assignments
                      // First, delete existing assignments
                      const { error: deleteAssignmentsError } = await supabase
                        .from('digger_profession_assignments')
                        .delete()
                        .eq('digger_profile_id', existingProfileId);

                      if (deleteAssignmentsError) throw deleteAssignmentsError;

                      // Then, insert new assignments
                      const assignments = selectedProfessionIds.map((professionId, index) => ({
                        digger_profile_id: existingProfileId,
                        profession_id: professionId,
                        is_primary: index === 0 // First profession is primary
                      }));

                      const { error: insertAssignmentsError } = await supabase
                        .from('digger_profession_assignments')
                        .insert(assignments);

                      if (insertAssignmentsError) throw insertAssignmentsError;
                      
                      toast.success(`Profile updated with ${selected.length} keywords and ${selectedProfessionIds.length} profession${selectedProfessionIds.length !== 1 ? 's' : ''}!`);

                      // Navigate back to the profile detail page
                      navigate(`/digger/${existingProfileId}`, { replace: true });
                    } else {
                      // CREATE new profile
                      // 1. Check if user has digger role, if not, assign it
                      const { data: existingRoles } = await supabase
                        .from('user_app_roles')
                        .select('app_role')
                        .eq('user_id', user.id);

                      const hasDiggerRole = existingRoles?.some(r => r.app_role === 'digger');

                      if (!hasDiggerRole) {
                        // Try direct INSERT first
                        let roleError = null;
                        const { error: directInsertError } = await supabase
                          .from('user_app_roles')
                          .insert({
                            user_id: user.id,
                            app_role: 'digger'
                          });

                        // If we get infinite recursion error, use RPC function instead
                        if (directInsertError) {
                          if (directInsertError.code === '42P17' || directInsertError.message?.includes('infinite recursion')) {
                            console.log("Infinite recursion detected, using RPC function to bypass RLS");
                            // Use RPC function to insert role (bypasses RLS)
                            const { error: rpcError } = await (supabase
                              .rpc as any)('insert_user_app_role', {
                                p_user_id: user.id,
                                p_app_role: 'digger'
                              });
                            
                            if (rpcError) {
                              roleError = rpcError;
                            }
                          } else {
                            roleError = directInsertError;
                          }
                        }

                        if (roleError) {
                          console.error("Error creating digger role:", roleError);
                          throw roleError;
                        }
                        toast.success("Registered as Digger!");
                      }

                      // 2. Create a new profile
                      const zipCodesArray = locationPreferenceType === "zip_codes" && serviceZipCodes
                        ? serviceZipCodes.split(/[,;]/).map(z => z.trim()).filter(z => z.length > 0)
                        : null;

                      // Inherit username and location from existing profile when creating additional profiles
                      const { data: existingProfile } = await supabase
                        .from('digger_profiles')
                        .select('handle, business_name, company_name, country, location, state')
                        .eq('user_id', user.id)
                        .limit(1)
                        .maybeSingle();
                      const inheritedUsername = existingProfile?.handle || existingProfile?.business_name || '';
                      const countryToUse = country || existingProfile?.country || null;
                      const stateToUse = selectedState || existingProfile?.state || null;
                      const locationString = (city.trim() || selectedState || country)
                        ? [city.trim(), selectedState, country].filter(Boolean).join(', ')
                        : (existingProfile?.location || 'Not specified');

                      const { data: newProfile, error: createError } = await supabase
                        .from('digger_profiles')
                        .insert({
                          user_id: user.id,
                          business_name: inheritedUsername,
                          company_name: inheritedUsername || null,
                          handle: null,
                          profile_name: profileName.trim(),
                          keywords: selected,
                          location: locationString,
                          phone: userPhone || 'Not specified',
                          is_primary: false, // All profiles use is_primary=false in new system
                          service_zip_codes: zipCodesArray,
                          service_radius_center: locationPreferenceType === "radius" ? serviceRadiusCenter || null : null,
                          service_radius_miles: locationPreferenceType === "radius" ? serviceRadiusMiles : null,
                          country: countryToUse,
                          state: stateToUse,
                        })
                        .select()
                        .single();

                      if (createError) throw createError;

                      // Create profession assignments
                      const assignments = selectedProfessionIds.map((professionId, index) => ({
                        digger_profile_id: newProfile.id,
                        profession_id: professionId,
                        is_primary: index === 0 // First profession is primary
                      }));

                      const { error: insertAssignmentsError } = await supabase
                        .from('digger_profession_assignments')
                        .insert(assignments);

                      if (insertAssignmentsError) throw insertAssignmentsError;
                      
                      // Send first onboarding email (non-blocking)
                      supabase.functions.invoke('send-digger-onboarding-email', {
                        body: {
                          userId: user.id,
                          email: user.email || '',
                          name: user.user_metadata?.full_name || '',
                          step: 1,
                          diggerProfileId: newProfile.id,
                        },
                      }).catch(err => {
                        console.warn('Failed to send onboarding email (non-critical):', err);
                      });
                      
                      // Clear sessionStorage after successful profile creation
                      sessionStorage.removeItem('newProfileName');
                      
                      toast.success(`Profile "${profileName.trim()}" created! Complete your profile to attract more clients.`);

                      // Navigate to Edit profile page so diggers can complete their profile
                      navigate(`/edit-digger-profile?profileId=${newProfile.id}`, { replace: true });
                    }
                  } catch (error: any) {
                    console.error("Error saving Digger profile:", error);
                    toast.error(error.message || "Failed to save profile");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={selectedKeywords.size === 0 || isProcessing || selectedProfessionIds.length === 0 || !profileName.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving your profile...
                  </>
                ) : (
                  `Use ${selectedKeywords.size} Selected Keyword${selectedKeywords.size !== 1 ? 's' : ''}`
                )}
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 touch-manipulation"
                onClick={() => {
                  setSuggestedKeywords([]);
                  setSelectedKeywords(new Set());
                  setIsAddingKeyword(false);
                  setNewKeyword("");
                  setProfileName("");
                  setCountry("");
                  setSelectedState("");
                  setCity("");
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
        </>
        )}
      </CardContent>
    </Card>
  );
};
