import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Loader2, Tag, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KeywordSuggestions } from "@/components/KeywordSuggestions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DiggerProfilePreview } from "@/components/DiggerProfilePreview";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";
import { generateEnhancedKeywordSuggestions } from "@/utils/enhancedKeywordSuggestions";

const DiggerRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [profession, setProfession] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [customProfession, setCustomProfession] = useState("");
  const [pricingModel, setPricingModel] = useState<string>("commission");
  const [offersFreEstimates, setOffersFreEstimates] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [workPhotos, setWorkPhotos] = useState<File[]>([]);
  const [workPhotoPreviews, setWorkPhotoPreviews] = useState<string[]>([]);
  const { calculateLeadCost } = useCommissionCalculator();
  
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
    }
  }, [user, navigate]);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Profile image must be less than 5MB");
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWorkPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (workPhotos.length + files.length > 6) {
      toast.error("Maximum 6 work photos allowed");
      return;
    }
    
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per image.`);
        return false;
      }
      return true;
    });

    setWorkPhotos(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWorkPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeWorkPhoto = (index: number) => {
    setWorkPhotos(prev => prev.filter((_, i) => i !== index));
    setWorkPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImageToStorage = async (file: File, bucket: string, path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!businessName || !profession || !location || !phone || selectedCategories.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!pricingModel && !offersFreEstimates) {
      toast.error("Please select at least one pricing option (Fixed Price, Hourly, Both Models, or Free Estimates)");
      return;
    }

    setShowPreview(true);
  };

  const handleApprove = async () => {
    if (!user) return;

    // Check if "Other Professional Services" is selected and validate custom profession
    const otherCategorySelected = await checkOtherCategorySelected();
    if (otherCategorySelected && !customProfession.trim()) {
      toast.error("Please enter your profession for the 'Other' category");
      return;
    }

    setLoading(true);

    try {
      // Upload profile image if provided
      let profileImageUrl: string | null = null;
      if (profileImage) {
        const timestamp = Date.now();
        const fileName = `${user.id}/profile-${timestamp}.${profileImage.name.split('.').pop()}`;
        profileImageUrl = await uploadImageToStorage(profileImage, 'profile-images', fileName);
      }

      // Upload work photos if provided
      const workPhotoUrls: string[] = [];
      if (workPhotos.length > 0) {
        for (let i = 0; i < workPhotos.length; i++) {
          const timestamp = Date.now();
          const fileName = `${user.id}/work-${timestamp}-${i}.${workPhotos[i].name.split('.').pop()}`;
          const url = await uploadImageToStorage(workPhotos[i], 'work-photos', fileName);
          if (url) workPhotoUrls.push(url);
        }
      }

      const { error } = await supabase.from("digger_profiles").insert({
        user_id: user.id,
        business_name: businessName,
        profile_name: profileName || null,
        is_primary: isPrimary,
        profession,
        location,
        phone,
        bio: bio || null,
        keywords: keywords.length > 0 ? keywords : null,
        custom_occupation_title: customProfession.trim() || null,
        pricing_model: pricingModel,
        offers_free_estimates: offersFreEstimates,
        profile_image_url: profileImageUrl,
        work_photos: workPhotoUrls.length > 0 ? workPhotoUrls : null,
      });

      if (error) throw error;

      // Insert selected categories
      if (selectedCategories.length > 0) {
        const { data: profileData } = await supabase
          .from("digger_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profileData) {
          const categoryInserts = selectedCategories.map((categoryId) => ({
            digger_id: profileData.id,
            category_id: categoryId,
          }));

          await supabase.from("digger_categories").insert(categoryInserts);
        }
      }

      toast.success("Profile created successfully!");
      navigate("/profile-completion");
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const checkOtherCategorySelected = async () => {
    if (selectedCategories.length === 0) return false;
    
    const { data } = await supabase
      .from("categories")
      .select("name")
      .in("id", selectedCategories);
    
    return data?.some(cat => cat.name === "Other Professional Services") || false;
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

  if (!user) {
    return null;
  }

  if (showPreview) {
    return (
      <DiggerProfilePreview
        businessName={businessName}
        profession={profession}
        location={location}
        bio={bio}
        keywords={keywords}
        categoryNames={categoryNames}
        pricingModel={pricingModel}
        profileImagePreview={profileImagePreview}
        workPhotoPreviews={workPhotoPreviews}
        onApprove={handleApprove}
        onEdit={() => setShowPreview(false)}
        onCancel={() => navigate("/")}
      />
    );
  }

  const leadCostFree = calculateLeadCost('free').leadCost;
  const leadCostPro = calculateLeadCost('pro').leadCost;
  const leadCostPremium = calculateLeadCost('premium').leadCost;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Create Your Digger Profile</h1>
          
          <form onSubmit={handlePreview} className="space-y-6">
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
              customProfession={customProfession}
              onCustomProfessionChange={setCustomProfession}
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

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Photo</Label>
              <Input
                id="profileImage"
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="cursor-pointer"
              />
              {profileImagePreview && (
                <div className="mt-2 relative w-32 h-32 rounded-lg overflow-hidden border">
                  <img 
                    src={profileImagePreview} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={() => {
                      setProfileImage(null);
                      setProfileImagePreview("");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a professional photo (Max 5MB)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workPhotos">Work Samples</Label>
              <Input
                id="workPhotos"
                type="file"
                accept="image/*"
                multiple
                onChange={handleWorkPhotosChange}
                className="cursor-pointer"
                disabled={workPhotos.length >= 6}
              />
              {workPhotoPreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {workPhotoPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img 
                        src={preview} 
                        alt={`Work sample ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => removeWorkPhoto(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload up to 6 photos of your work (Max 5MB each)
              </p>
            </div>

            <div>
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
                      Lead Cost $60/$40/$0 + Award Fee $60/$40/$0 + 10%/6%/3% escrow fee
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
                      Lead Cost $60/$40/$0 + Award fee = 3x/2x/1x your average hourly rate + 10%/6%/3% escrow fee
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
                      Lead Cost $60/$40/$0 + Award fee = The higher of ($60/$40/$0 OR 3x/2x/1x average hourly rate) + 10%/6%/3% escrow fee
                    </p>
                  </div>
                </div>
              </RadioGroup>

              <div className="flex items-start space-x-3 p-4 mt-4 rounded-lg border bg-accent/30 hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id="free_estimates" 
                  checked={offersFreEstimates}
                  onCheckedChange={(checked) => setOffersFreEstimates(checked === true)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="free_estimates" className="font-semibold cursor-pointer">
                    Available for Free Estimates
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Free Estimate Charges: $150/$100/$50 (will be rebated against Awards of $5,000 or more, excluding hourly contracts)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
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

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                "Preview Profile"
              )}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DiggerRegistration;
