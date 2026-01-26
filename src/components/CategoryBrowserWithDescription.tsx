import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, Loader2, MapPin, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);

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
    setSelectedStates([]);
  }, [country]);

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

      const edgeFunctionPromise = supabase.functions.invoke('suggest-keywords-from-description', {
        body: { description: descriptionText }
      });

      const { data, error } = await Promise.race([edgeFunctionPromise, timeoutPromise]) as any;

      if (error) throw error;

      if (data?.keywords && data.keywords.length > 0) {
        setSuggestedKeywords(data.keywords);
        setSelectedKeywords(new Set(data.keywords));
        toast.success(`AI found ${data.keywords.length} relevant keywords!`);
        return;
      }
    } catch (error: any) {
      console.log("Edge function failed, using local keyword suggestions:", error);
      
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

  // AI-powered description enhancement
  const handleEnhanceDescription = async () => {
    if (!description.trim() || description.trim().length < 10) {
      toast.error("Please enter at least 10 characters to enhance");
      return;
    }

    setIsEnhancingDescription(true);
    try {
      const selectedProfessionNames = selectedProfessionIds
        .map(id => getProfessionById(id))
        .filter(Boolean)
        .map(p => p!.name);

      const { data, error } = await supabase.functions.invoke('enhance-gig-description', {
        body: { 
          description: description,
          labels: selectedProfessionNames.join(', ')
        }
      });

      if (error) throw error;

      if (data?.enhancedDescription) {
        setDescription(data.enhancedDescription);
        toast.success("Description enhanced with AI!");
      }
    } catch (error: any) {
      console.error("Failed to enhance description:", error);
      toast.error("Failed to enhance description. Please try again.");
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <CardTitle>Browse Categories</CardTitle>
        </div>
        {selectedProfessionIds.length > 0 && !existingProfileId && (
          <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium text-primary">
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
      <CardContent className="space-y-6">
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
              className="min-h-[150px] bg-background"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Be specific about your services and expertise in your selected professions
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEnhanceDescription}
                disabled={isEnhancingDescription || !description.trim() || description.trim().length < 10}
                className="shrink-0"
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

        {/* Save and Continue Button - Always visible when professions selected */}
        {selectedProfessionIds.length > 0 && !suggestedKeywords.length && (
          <div className="space-y-4">
            {description && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Next Steps</h4>
                <p className="text-sm text-muted-foreground">
                  Your description will be used to match you with relevant leads for your selected professions.
                  The more specific you are, the better your matches will be.
                </p>
              </div>
            )}
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleContinue}
              disabled={isProcessing || !description.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing your specialties...
                </>
              ) : (
                'Save and Continue'
              )}
            </Button>
            {!description.trim() && (
              <p className="text-xs text-muted-foreground text-center">
                Please describe your specialties above to continue
              </p>
            )}
          </div>
        )}

        {/* Selected Keywords Display */}
        {suggestedKeywords.length > 0 && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Selected Keywords ({suggestedKeywords.length})</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Click keywords to deselect them. Selected keywords have a checkmark and colored background. Click the X to remove them entirely.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords.map((keyword, index) => {
                  const isSelected = selectedKeywords.has(keyword);
                  const { cpc, leadCost } = getKeywordPricing(keyword);
                  return (
                    <div
                      key={index}
                      className={`group relative flex items-center gap-2 px-3 py-1.5 pr-8 rounded-md text-sm cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-2 border-primary text-primary font-medium'
                          : 'bg-background border-2 border-dashed border-border text-muted-foreground hover:border-primary/50'
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
                      {isSelected && <span>✓</span>}
                      <span>{keyword}</span>
                      <button
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
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
                        <X className="h-3.5 w-3.5" />
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
                className="w-full"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter a name for this profile. This will help you organize multiple profiles.
              </p>
            </div>

            {/* Location Preferences Section */}
            <Card className="p-4 border-2 border-primary/20 bg-primary/5 mt-4">
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
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-background ${!country ? 'border-destructive/50' : 'border-input'}`}
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
                    <Label className="flex items-center gap-1">
                      {getRegionLabel(country)} <span className="text-destructive font-semibold">*</span>
                      <span className="text-xs text-destructive">(required)</span>
                    </Label>
                    <div className={`rounded-md border p-3 max-h-48 overflow-y-auto ${selectedStates.length === 0 ? 'border-destructive/50' : 'border-input'}`}>
                      {/* All option */}
                      <div className="flex items-center space-x-2 pb-2 border-b border-border mb-2">
                        <Checkbox
                          id="state_all"
                          checked={selectedStates.length === getRegionsForCountry(country).length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStates(getRegionsForCountry(country));
                            } else {
                              setSelectedStates([]);
                            }
                          }}
                        />
                        <Label htmlFor="state_all" className="cursor-pointer font-medium">
                          All {getRegionLabel(country)}s
                        </Label>
                      </div>
                      {/* Individual state options */}
                      <div className="grid grid-cols-2 gap-2">
                        {getRegionsForCountry(country).map((region) => (
                          <div key={region} className="flex items-center space-x-2">
                            <Checkbox
                              id={`state_${region}`}
                              checked={selectedStates.includes(region)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStates(prev => [...prev, region]);
                                } else {
                                  setSelectedStates(prev => prev.filter(s => s !== region));
                                }
                              }}
                            />
                            <Label htmlFor={`state_${region}`} className="cursor-pointer text-sm font-normal">
                              {region}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedStates.length === 0 
                        ? 'Select at least one state/province' 
                        : selectedStates.length === getRegionsForCountry(country).length 
                          ? 'All states selected' 
                          : `${selectedStates.length} selected`}
                    </p>
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
                      className="bg-background"
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
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          name="locationPreferenceBrowser"
                          value="zip_codes" 
                          id="zip_codes_browser" 
                          checked={locationPreferenceType === "zip_codes"}
                          onChange={() => setLocationPreferenceType("zip_codes")}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="zip_codes_browser" className="cursor-pointer font-normal">
                          Specific Zip Codes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          name="locationPreferenceBrowser"
                          value="radius" 
                          id="radius_browser" 
                          checked={locationPreferenceType === "radius"}
                          onChange={() => setLocationPreferenceType("radius")}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="radius_browser" className="cursor-pointer font-normal">
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
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter multiple zip codes separated by commas
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor="serviceRadiusCenter">Center Zip Code</Label>
                          <Input
                            id="serviceRadiusCenter"
                            value={serviceRadiusCenter}
                            onChange={(e) => setServiceRadiusCenter(e.target.value)}
                            placeholder="e.g., 10001"
                            maxLength={10}
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
                )}
              </div>
            </Card>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
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
                  if (regions.length > 0 && selectedStates.length === 0) {
                    toast.error(`Please select at least one ${getRegionLabel(country).toLowerCase()}`);
                    return;
                  }

                  const selected = Array.from(selectedKeywords);
                  setIsProcessing(true);

                  try {
                    // Check if we're editing an existing profile or creating new
                    if (existingProfileId) {
                      // UPDATE existing profile
                      const zipCodesArray = locationPreferenceType === "zip_codes" && serviceZipCodes
                        ? serviceZipCodes.split(/[,;]/).map(z => z.trim()).filter(z => z.length > 0)
                        : null;

                      const { error: updateError } = await supabase
                        .from('digger_profiles')
                        .update({
                          keywords: selected,
                          profile_name: profileName.trim(),
                          service_zip_codes: zipCodesArray,
                          service_radius_center: locationPreferenceType === "radius" ? serviceRadiusCenter || null : null,
                          service_radius_miles: locationPreferenceType === "radius" ? serviceRadiusMiles : null,
                          country: country,
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

                      // Build location string from city, state, and country
                      const locationParts: string[] = [];
                      if (city.trim()) locationParts.push(city.trim());
                      if (selectedStates.length > 0) locationParts.push(selectedStates.join(', '));
                      if (country) locationParts.push(country);
                      const locationString = locationParts.length > 0 
                        ? locationParts.join(', ')
                        : 'Not specified';

                      const { data: newProfile, error: createError } = await supabase
                        .from('digger_profiles')
                        .insert({
                          user_id: user.id,
                          business_name: '', // Business name is separate - user sets it later
                          profile_name: profileName.trim(),
                          keywords: selected,
                          location: locationString,
                          phone: userPhone || 'Not specified',
                          is_primary: false, // All profiles use is_primary=false in new system
                          service_zip_codes: zipCodesArray,
                          service_radius_center: locationPreferenceType === "radius" ? serviceRadiusCenter || null : null,
                          service_radius_miles: locationPreferenceType === "radius" ? serviceRadiusMiles : null,
                          country: country,
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
                      
                      toast.success(`Profile "${profileName.trim()}" created with ${selected.length} keywords and ${selectedProfessionIds.length} profession${selectedProfessionIds.length !== 1 ? 's' : ''}!`);

                      // Navigate to the new profile's detail page for lead purchasing
                      navigate(`/digger/${newProfile.id}`, { replace: true });
                    }
                  } catch (error: any) {
                    console.error("Error saving Digger profile:", error);
                    toast.error(error.message || "Failed to save profile");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={selectedKeywords.size === 0 || isProcessing || selectedProfessionIds.length === 0 || !profileName.trim() || !country || (getRegionsForCountry(country).length > 0 && selectedStates.length === 0)}
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
                onClick={() => {
                  setSuggestedKeywords([]);
                  setSelectedKeywords(new Set());
                  setIsAddingKeyword(false);
                  setNewKeyword("");
                  setProfileName("");
                  setCountry("");
                  setSelectedStates([]);
                  setCity("");
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
