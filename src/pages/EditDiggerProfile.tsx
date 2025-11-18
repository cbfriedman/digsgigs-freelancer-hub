import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { RegistrationCategorySelector } from "@/components/RegistrationCategorySelector";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { Loader2, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KeywordSuggestions } from "@/components/KeywordSuggestions";
import { generateEnhancedKeywordSuggestions } from "@/utils/enhancedKeywordSuggestions";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { BioGenerator } from "@/components/BioGenerator";
import { ProfileCompletionWidget } from "@/components/ProfileCompletionWidget";

const EditDiggerProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [profession, setProfession] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [profileId, setProfileId] = useState<string>("");
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [hourlyRateMin, setHourlyRateMin] = useState<number | null>(null);
  const [hourlyRateMax, setHourlyRateMax] = useState<number | null>(null);
  const [pricingModel, setPricingModel] = useState<string>("commission");
  const [offersFreEstimates, setOffersFreEstimates] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  // Parse keywords from input
  const keywords = keywordsInput
    .split(/[,;]/)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  // Generate keyword suggestions based on profession and categories
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!profession && categoryNames.length === 0) {
        setKeywordSuggestions([]);
        return;
      }
      const suggestions = await generateEnhancedKeywordSuggestions(profession, categoryNames);
      setKeywordSuggestions(suggestions);
    };

    loadSuggestions();
  }, [profession, categoryNames]);

  // Fetch category names when selected categories change
  useEffect(() => {
    const fetchCategoryNames = async () => {
      if (selectedCategories.length === 0) {
        setCategoryNames([]);
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .in("id", selectedCategories);

      if (!error && data) {
        setCategoryNames(data.map(cat => cat.name));
      }
    };

    fetchCategoryNames();
  }, [selectedCategories]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    const profileIdFromUrl = searchParams.get('profileId');
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

    try {
      const { data: profile, error } = await supabase
        .from("digger_profiles")
        .select("*, digger_categories(category_id)")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setProfileId(profile.id);
        setBusinessName(profile.business_name || "");
        setProfession(profile.profession || "");
        setLocation(profile.location || "");
        setPhone(profile.phone || "");
        setBio(profile.bio || "");
        setKeywordsInput(profile.keywords?.join(", ") || "");
        setHourlyRateMin(profile.hourly_rate_min);
        setHourlyRateMax(profile.hourly_rate_max);
        setPricingModel(profile.pricing_model || "commission");
        setOffersFreEstimates(profile.offers_free_estimates || false);
        setProfileData(profile);
        
        const categoryIds = profile.digger_categories?.map((dc: any) => dc.category_id) || [];
        setSelectedCategories(categoryIds);
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

    if (!businessName || !profession || !location || !phone || selectedCategories.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!pricingModel && !offersFreEstimates) {
      toast.error("Please select at least one pricing option (Fixed Price, Hourly, Both Models, or Free Estimates)");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("digger_profiles")
        .update({
          business_name: businessName,
          profile_name: profileName || null,
          is_primary: isPrimary,
          profession,
          location,
          phone,
          bio: bio || null,
          keywords: keywords.length > 0 ? keywords : null,
          pricing_model: pricingModel,
          offers_free_estimates: offersFreEstimates,
        })
        .eq("id", profileId);

      if (error) throw error;

      // Update categories
      await supabase.from("digger_categories").delete().eq("digger_id", profileId);

      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map((categoryId) => ({
          digger_id: profileId,
          category_id: categoryId,
        }));

        await supabase.from("digger_categories").insert(categoryInserts);
      }

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
          p_profession: profession || null,
          p_category_name: categoryNames.length > 0 ? categoryNames[0] : null
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
            <div className="lg:col-span-2">
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

            <div className="space-y-2">
              <Label htmlFor="profileName">Profile Name (Optional)</Label>
              <Input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="E.g., 'Residential Services' or 'Commercial Division'"
              />
              <p className="text-xs text-muted-foreground">
                Give this profile a name to distinguish it from your other profiles
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrimary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Set as primary profile
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profession">Profession *</Label>
              <Input
                id="profession"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g., Plumber, Electrician"
                required
              />
            </div>

            <RegistrationCategorySelector
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
            />

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
                profession={profession}
                currentBio={bio}
                onBioGenerated={setBio}
              />
            </div>

            <div id="pricing">
              <Label className="text-base font-semibold">Available for *</Label>
              <p className="text-sm text-muted-foreground mb-3">Select at least one pricing option</p>
              <RadioGroup value={pricingModel} onValueChange={setPricingModel} className="space-y-4">
                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="commission" id="commission" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="commission" className="font-semibold cursor-pointer">
                      Fixed Price Contracts
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lead Cost $20/$10/$5 + 12%/8%/3% award fee + 5% escrow processing fee
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="hourly" id="hourly" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="hourly" className="font-semibold cursor-pointer">
                      Time and Materials (Hourly)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lead Cost $20/$10/$5 + Award fee = 3x/2x/1x your average hourly rate + 5% escrow processing fee
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="both" id="both" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="both" className="font-semibold cursor-pointer">
                      Both Models
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lead Cost $20/$10/$5 + Award fee varies by model + 5% escrow processing fee
                    </p>
                  </div>
                </div>
              </RadioGroup>

              <div className="flex items-start space-x-3 p-4 mt-4 rounded-lg border bg-accent/30 hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id="free_estimates_edit" 
                  checked={offersFreEstimates}
                  onCheckedChange={(checked) => setOffersFreEstimates(checked === true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="free_estimates_edit" className="font-semibold cursor-pointer">
                    Available for Free Estimates
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Free Estimate Charges: $150/$100/$50 (will be rebated against Awards of $5,000 or more, excluding hourly contracts)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2" id="keywords">
              <div className="flex items-center justify-between">
                <Label htmlFor="keywords">Keywords</Label>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={keywords.length > 0 ? "default" : "secondary"}>
                    {keywords.length} {keywords.length === 1 ? "keyword" : "keywords"}
                  </Badge>
                </div>
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
              {(profession || selectedCategories.length > 0) && (
                <KeywordSuggestions
                  suggestions={keywordSuggestions}
                  currentKeywords={keywords}
                  onAddKeyword={handleAddKeyword}
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
