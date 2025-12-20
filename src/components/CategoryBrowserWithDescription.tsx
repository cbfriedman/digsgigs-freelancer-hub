import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, Plus, Loader2, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateKeywordSuggestions } from "@/utils/keywordSuggestions";
import { getIndustrySpecialties, hasIndustrySpecialties } from "@/utils/industrySpecialties";
import { SpecialtyRequestForm } from "./SpecialtyRequestForm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { getRegionsForCountry, getRegionLabel } from "@/config/locationData";
import { GOOGLE_CPC_KEYWORDS } from "@/config/googleCpcKeywords";

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

const DEFAULT_CATEGORIES = [
  "Credit Repair",
  "Tax Relief Services",
  "Legal Services",
  "Insurance",
  "Mortgage & Financing",
  "Financial Services & Accounting",
  "Investors",
  "Construction & Home Services",
  "Medical & Healthcare",
  "Technology Services",
  "Business Services",
  "Automotive Services",
  "Pet Care",
  "Education & Tutoring",
  "Fitness & Wellness",
  "Event Services",
  "Cleaning & Maintenance",
  "Moving & Storage",
  "Beauty & Personal Care"
].sort();

interface CustomCategory {
  id: string;
  name: string;
  user_id: string;
}

export const CategoryBrowserWithDescription = () => {
  const { user, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingProfileId = searchParams.get('profileId');
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [newKeyword, setNewKeyword] = useState("");
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [showSpecialtyRequest, setShowSpecialtyRequest] = useState(false);
  const [industrySpecialties, setIndustrySpecialties] = useState<string[]>([]);
  const [profileName, setProfileName] = useState("");
  const [locationPreferenceType, setLocationPreferenceType] = useState<"zip_codes" | "radius">("zip_codes");
  const [serviceZipCodes, setServiceZipCodes] = useState("");
  const [serviceRadiusCenter, setServiceRadiusCenter] = useState("");
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState<number>(25);
  const [country, setCountry] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [hasPrimaryForCategory, setHasPrimaryForCategory] = useState(false);
  const [isSecondaryProfile, setIsSecondaryProfile] = useState(false);

  // Reset state when country changes
  useEffect(() => {
    setSelectedStates([]);
  }, [country]);

  // Check if primary profile exists for selected category
  useEffect(() => {
    const checkPrimaryProfile = async () => {
      if (!user?.id || !selectedCategory || existingProfileId) return;
      
      const { data, error } = await supabase
        .from('digger_profiles')
        .select('id, is_primary, profile_name')
        .eq('user_id', user.id)
        .eq('profile_name', selectedCategory)
        .eq('is_primary', true)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking primary profile:", error);
        return;
      }
      
      const primaryExists = !!data;
      setHasPrimaryForCategory(primaryExists);
      
      // If no primary exists for this category, auto-set profile name to category
      if (!primaryExists && !existingProfileId) {
        setProfileName(selectedCategory);
        setIsSecondaryProfile(false);
      }
    };
    
    checkPrimaryProfile();
  }, [selectedCategory, user?.id, existingProfileId]);

  // Load profile name from sessionStorage only for secondary profiles
  useEffect(() => {
    const storedProfileName = sessionStorage.getItem('newProfileName');
    if (storedProfileName && !existingProfileId && hasPrimaryForCategory) {
      setProfileName(storedProfileName);
      setIsSecondaryProfile(true);
    }
  }, [existingProfileId, hasPrimaryForCategory]);

  // Fetch user's custom categories
  useEffect(() => {
    if (user?.id) {
      fetchCustomCategories();
    }
  }, [user?.id]);

  const fetchCustomCategories = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('custom_categories')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error fetching custom categories:", error);
      return;
    }
    
    setCustomCategories(data || []);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to create custom categories");
      return;
    }

    setIsCreatingCategory(true);

    try {
      const { data, error } = await supabase
        .from('custom_categories')
        .insert({
          name: newCategoryName.trim(),
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setCustomCategories(prev => [...prev, data]);
      setNewCategoryName("");
      setIsAddingCategory(false);
      toast.success("Custom category created!");
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error(error.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleContinue = async () => {
    // Description is optional - if empty, generate keywords from category/specialty
    const descriptionText = description.trim() || `${selectedCategory} ${selectedSpecialties.join(', ')}`.trim();

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

      const profession = categoryToprofession[selectedCategory] || "contractor";
      const localKeywords = generateKeywordSuggestions(profession, [selectedCategory.toLowerCase()]);

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

  // Update industry specialties when category changes
  useEffect(() => {
    if (selectedCategory) {
      const specialties = getIndustrySpecialties(selectedCategory);
      setIndustrySpecialties(specialties);
      setSelectedSpecialties([]); // Reset specialties when category changes
    } else {
      setIndustrySpecialties([]);
      setSelectedSpecialties([]);
    }
  }, [selectedCategory]);

  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map(c => c.name)
  ].sort();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <CardTitle>Browse Categories</CardTitle>
        </div>
        {selectedCategory && !existingProfileId && (
          <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium text-primary">
              {hasPrimaryForCategory ? (
                <>Creating Secondary Profile: <span className="font-bold">{profileName || '(enter name below)'}</span></>
              ) : (
                <>Creating Primary Profile: <span className="font-bold">{selectedCategory}</span></>
              )}
            </p>
            {!hasPrimaryForCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                This will be your primary profile for {selectedCategory}
              </p>
            )}
          </div>
        )}
        <CardDescription>
          Select your industry category and describe your specialties
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection - Horizontal Grid */}
        <div className="space-y-3">
          <Label>Select Industry Category</Label>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                {category}
                {customCategories.some(c => c.name === category) && (
                  <span className="ml-1 text-xs opacity-70">(Custom)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Add Custom Industry Category */}
        {user && (
          <div className="space-y-2">
            {!isAddingCategory ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingCategory(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add custom Industry Category
              </Button>
            ) : (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <Label htmlFor="newCategory">New Category Name</Label>
                <Input
                  id="newCategory"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name..."
                  className="bg-background"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory}
                    size="sm"
                  >
                    {isCreatingCategory ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This category will only be visible to you
                </p>
              </div>
            )}
          </div>
        )}

        {/* Specialty Selection - Multi-select with checkboxes */}
        {selectedCategory && hasIndustrySpecialties(selectedCategory) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Specialties</Label>
              {selectedSpecialties.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedSpecialties.length} selected
                </span>
              )}
            </div>
            
            {/* Select All / Clear All buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedSpecialties([...industrySpecialties])}
                disabled={selectedSpecialties.length === industrySpecialties.length}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedSpecialties([])}
                disabled={selectedSpecialties.length === 0}
              >
                Clear All
              </Button>
            </div>
            
            {/* Checkbox list - Horizontal grid layout */}
            <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto bg-background">
              <div className="flex flex-wrap gap-2">
                {industrySpecialties.map((specialty) => (
                  <label
                    key={specialty}
                    htmlFor={`specialty-${specialty}`}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border cursor-pointer transition-colors text-sm ${
                      selectedSpecialties.includes(specialty)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    <Checkbox
                      id={`specialty-${specialty}`}
                      checked={selectedSpecialties.includes(specialty)}
                      className="hidden"
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSpecialties([...selectedSpecialties, specialty]);
                        } else {
                          setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
                        }
                      }}
                    />
                    {specialty}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Request Custom Specialty */}
            <Dialog open={showSpecialtyRequest} onOpenChange={setShowSpecialtyRequest}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Request Custom Specialty
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <SpecialtyRequestForm
                  industry={selectedCategory}
                  profession={selectedCategory}
                  onSuccess={() => {
                    setShowSpecialtyRequest(false);
                    toast.success("You can now add keywords for your custom specialty!");
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}


        {/* Specialty Description */}
        {selectedCategory && (
          <div className="space-y-2">
            <Label htmlFor="description">Describe Your Specialties</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                selectedSpecialties.length > 0
                  ? `Describe your expertise in ${selectedSpecialties.join(', ')}...`
                  : "Describe what you do within this category, your specific services, expertise, and specializations..."
              }
              className="min-h-[150px] bg-background"
            />
            <p className="text-sm text-muted-foreground">
              Be specific about your services and expertise within {selectedSpecialties.length > 0 ? selectedSpecialties.join(', ') : selectedCategory}
            </p>
          </div>
        )}

        {/* Info Box and Continue Button */}
        {selectedCategory && description && !suggestedKeywords.length && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Next Steps</h4>
              <p className="text-sm text-muted-foreground">
                Your description will be used to match you with relevant leads in the {selectedCategory} category.
                The more specific you are, the better your matches will be.
              </p>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleContinue}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing your specialties...
                </>
              ) : (
                'Continue to Keyword Selection'
              )}
            </Button>
          </div>
        )}

        {/* Suggested Keywords Display */}
        {suggestedKeywords.length > 0 && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Suggested Keywords ({suggestedKeywords.length})</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Click keywords to select/deselect them. Selected keywords have a checkmark and colored background. Click the X to remove them entirely.
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
                      {cpc !== null && (
                        <span className="text-xs opacity-75">
                          <span className="text-muted-foreground">CPC: ${cpc}</span>
                          {leadCost !== null && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400">• Our cost: ${leadCost.toFixed(2)}</span>
                          )}
                        </span>
                      )}
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
              
              {/* Add Custom Keyword */}
              <div className="mt-4 pt-4 border-t border-border">
                {!isAddingKeyword ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingKeyword(true)}
                    className="w-full"
                  >
                    + Add Custom Keyword
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter keyword..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKeyword.trim()) {
                          const trimmed = newKeyword.trim();
                          if (!suggestedKeywords.includes(trimmed)) {
                            setSuggestedKeywords([...suggestedKeywords, trimmed]);
                            setSelectedKeywords(new Set([...selectedKeywords, trimmed]));
                          }
                          setNewKeyword("");
                          setIsAddingKeyword(false);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const trimmed = newKeyword.trim();
                        if (trimmed) {
                          if (!suggestedKeywords.includes(trimmed)) {
                            setSuggestedKeywords([...suggestedKeywords, trimmed]);
                            setSelectedKeywords(new Set([...selectedKeywords, trimmed]));
                          }
                          setNewKeyword("");
                          setIsAddingKeyword(false);
                        }
                      }}
                      disabled={!newKeyword.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewKeyword("");
                        setIsAddingKeyword(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Profile Name Input - Only for secondary profiles */}
            {hasPrimaryForCategory ? (
              <div className="space-y-2 mt-4">
                <Label htmlFor="profile-name">Secondary Profile Name <span className="text-destructive">*</span></Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g., Commercial Cleaning, Residential Services"
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You already have a primary profile for {selectedCategory}. Enter a unique name for this secondary profile.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Label className="text-green-700 dark:text-green-400 font-medium">
                  ✓ Primary Profile Name
                </Label>
                <p className="text-sm font-medium">{selectedCategory}</p>
                <p className="text-xs text-muted-foreground">
                  Primary profiles are automatically named after the category. Only one primary profile is allowed per category.
                </p>
              </div>
            )}

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

                {/* State/Province - Required (when country has regions) */}
                {country && getRegionsForCountry(country).length > 0 && (
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

                  if (selectedSpecialties.length === 0) {
                    toast.error("Please select at least one specialty before continuing");
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
                          profession: selectedSpecialties.join(', '),
                          service_zip_codes: zipCodesArray,
                          service_radius_center: locationPreferenceType === "radius" ? serviceRadiusCenter || null : null,
                          service_radius_miles: locationPreferenceType === "radius" ? serviceRadiusMiles : null,
                          country: country,
                          // Note: state and city fields removed - not in database schema. 
                          // State/city info can be stored in location field if needed.
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingProfileId);

                      if (updateError) throw updateError;
                      
                      toast.success(`Profile updated with ${selected.length} keywords!`);

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
                        const { error: roleError } = await supabase
                          .from('user_app_roles')
                          .insert({
                            user_id: user.id,
                            app_role: 'digger'
                          });

                        if (roleError) throw roleError;
                        toast.success("Registered as Digger!");
                      }

                      // 2. Create a new profile
                      const zipCodesArray = locationPreferenceType === "zip_codes" && serviceZipCodes
                        ? serviceZipCodes.split(/[,;]/).map(z => z.trim()).filter(z => z.length > 0)
                        : null;

                      // Primary profile = first profile for this category (named after category)
                      // Secondary profiles have custom names
                      const isPrimaryProfile = !hasPrimaryForCategory;
                      const finalProfileName = isPrimaryProfile ? selectedCategory : profileName.trim();

                      // Build location string from city, state, and country
                      // Include state info in location since state column doesn't exist in database
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
                          profile_name: finalProfileName,
                          profession: selectedSpecialties.join(', '),
                          keywords: selected,
                          location: locationString,
                          phone: 'Not specified',
                          is_primary: isPrimaryProfile,
                          service_zip_codes: zipCodesArray,
                          service_radius_center: locationPreferenceType === "radius" ? serviceRadiusCenter || null : null,
                          service_radius_miles: locationPreferenceType === "radius" ? serviceRadiusMiles : null,
                          country: country,
                          // Note: state and city fields removed - not in database schema. 
                          // State/city info is included in location field.
                        })
                        .select()
                        .single();

                      if (createError) throw createError;
                      
                      // Clear sessionStorage after successful profile creation
                      sessionStorage.removeItem('newProfileName');
                      
                      const typeLabel = isPrimaryProfile ? 'Primary' : 'Secondary';
                      toast.success(`${typeLabel} profile "${finalProfileName}" created with ${selected.length} keywords!`);

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
                disabled={selectedKeywords.size === 0 || isProcessing || selectedSpecialties.length === 0 || !selectedCategory || (hasPrimaryForCategory && !profileName.trim()) || !country || (getRegionsForCountry(country).length > 0 && selectedStates.length === 0)}
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
