import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ProfileTitleTaglineEditor } from "@/components/ProfileTitleTaglineEditor";
import { DiggerProfileCard } from "@/components/DiggerProfileCard";
import { IndustryMultiSelector } from "@/components/IndustryMultiSelector";
import { Briefcase, Loader2, ShoppingCart, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lookupCPC } from "@/utils/cpcLookup";
import { INDUSTRY_PRICING } from "@/config/pricing";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ProfileCreationDemo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [companyName, setCompanyName] = useState("Elite Home Services");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [location, setLocation] = useState("Los Angeles, CA");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["Kitchen Remodeling", "Bathroom Renovation", "Custom Cabinets"]);
  const [profession, setProfession] = useState("Home Remodeling Contractor");
  
  const [keywordQuantities, setKeywordQuantities] = useState<Record<string, { nonExclusive: number; semiExclusive: number; exclusive24h: number }>>({});

  // Load user's actual profile data if logged in
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profiles, error } = await supabase
          .from("digger_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        if (profiles && profiles.length > 0) {
          const profile = profiles[0];
          setPhotoUrl(profile.profile_image_url || "");
          setCompanyName(profile.business_name || "Elite Home Services");
          setTitle(profile.custom_occupation_title || "");
          setTagline(profile.tagline || "");
          setLocation(profile.location || "Los Angeles, CA");
          setSelectedIndustries(profile.keywords || ["Kitchen Remodeling", "Bathroom Renovation", "Custom Cabinets"]);
          setProfession(profile.profession || "Home Remodeling Contractor");
          
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user]);

  // Calculate pricing for a keyword
  const calculatePricing = (keyword: string) => {
    const cpcData = lookupCPC(keyword);
    const googleCPC = cpcData?.estimatedCPC || 37.50;
    
    // Non-exclusive = 20% of Google CPC
    const nonExclusive = googleCPC * 0.20;
    // Semi-exclusive = Google CPC
    const semiExclusive = googleCPC;
    // 24hr Exclusive = 2x Google CPC
    const exclusive24h = googleCPC * 2;
    
    return {
      googleCPC,
      nonExclusive: Math.round(nonExclusive * 100) / 100,
      semiExclusive: Math.round(semiExclusive * 100) / 100,
      exclusive24h: Math.round(exclusive24h * 100) / 100
    };
  };

  // Update quantity for a keyword and exclusivity type
  const updateQuantity = (keyword: string, type: 'nonExclusive' | 'semiExclusive' | 'exclusive24h', value: number) => {
    setKeywordQuantities(prev => ({
      ...prev,
      [keyword]: {
        ...prev[keyword],
        [type]: Math.max(0, value)
      }
    }));
  };

  // Get quantity for a keyword and type
  const getQuantity = (keyword: string, type: 'nonExclusive' | 'semiExclusive' | 'exclusive24h') => {
    return keywordQuantities[keyword]?.[type] || 0;
  };

  // Save profile configuration to cart
  const handleAddToCart = () => {
    if (!companyName || selectedIndustries.length === 0) {
      toast.error("Please fill in company name and select at least one specialty");
      return;
    }

    const cartItem = {
      id: Date.now().toString(),
      fullName: user?.user_metadata?.full_name || "Anonymous",
      companyName,
      email: user?.email || "",
      phone: user?.user_metadata?.phone || "",
      industries: selectedIndustries,
      leadTierDescription: profession,
      timestamp: new Date().toISOString()
    };

    const existingCart = JSON.parse(localStorage.getItem("profileCart") || "[]");
    existingCart.push(cartItem);
    localStorage.setItem("profileCart", JSON.stringify(existingCart));
    window.dispatchEvent(new Event('storage'));
    
    toast.success("Profile configuration added to cart");
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!user) {
      toast.error("Please log in to save your profile");
      return;
    }

    if (!companyName || selectedIndustries.length === 0) {
      toast.error("Please fill in company name and select at least one specialty");
      return;
    }

    setSaving(true);
    try {
      // Check if profile exists
      const { data: existingProfiles } = await supabase
        .from("digger_profiles")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      const profileData = {
        user_id: user.id,
        business_name: companyName,
        custom_occupation_title: title,
        tagline: tagline,
        location: location,
        keywords: selectedIndustries,
        profession: profession,
        
        profile_image_url: photoUrl,
        phone: user.user_metadata?.phone || "",
        updated_at: new Date().toISOString()
      };

      if (existingProfiles && existingProfiles.length > 0) {
        // Update existing profile
        const { error } = await supabase
          .from("digger_profiles")
          .update(profileData)
          .eq("id", existingProfiles[0].id);
        
        if (error) throw error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from("digger_profiles")
          .insert(profileData);
        
        if (error) throw error;
      }

      toast.success("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Proceed to checkout
  const handleCheckout = () => {
    handleAddToCart();
    navigate("/checkout");
  };

  return (
    <>
      <Helmet>
        <title>Profile Creation Demo - DigsandGigs</title>
        <meta name="description" content="See how to create your professional digger profile with AI-powered suggestions" />
      </Helmet>

      <Navigation />

      {loading ? (
        <div className="min-h-screen bg-background py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-background py-8">
        <div className="container max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
              <Briefcase className="h-8 w-8 text-primary" />
              Create Your Digs Profile
            </h1>
            <p className="text-muted-foreground">
              Build a professional profile with AI-powered suggestions
            </p>
          </div>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            {/* Left Column - Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Fill in your details and let AI help you craft the perfect profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Photo Upload */}
                  <ProfilePhotoUpload
                    currentPhotoUrl={photoUrl}
                    onPhotoChange={setPhotoUrl}
                    companyName={companyName}
                  />

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Business Name"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State"
                    />
                  </div>

                  {/* Profession */}
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession</Label>
                    <Input
                      id="profession"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="Your Profession"
                    />
                  </div>

                  {/* Keywords/Specialties */}
                  <div className="space-y-3">
                    <Label>Specialties & Lead Types</Label>
                    
                    <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5 space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        ⚠️ Important: Lead Matching Criteria
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>You will only receive leads that contain your selected specialties.</strong> To maximize your lead opportunities, we recommend selecting all available specialty keywords related to your profession or creating your own custom keywords.
                      </p>
                    </div>
                    
                    <IndustryMultiSelector
                      selectedIndustries={selectedIndustries}
                      onIndustriesChange={setSelectedIndustries}
                    />
                  </div>

                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Title & Tagline</CardTitle>
                  <CardDescription>
                    Use AI to generate compelling titles and taglines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileTitleTaglineEditor
                    title={title}
                    tagline={tagline}
                    onTitleChange={setTitle}
                    onTaglineChange={setTagline}
                    companyName={companyName}
                    profession={profession}
                    keywords={selectedIndustries}
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Card className="border-2 border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Profile
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleAddToCart}
                      className="flex-1"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </Button>
                    <Button 
                      onClick={handleCheckout}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      Proceed to Checkout
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Save your profile or add to cart to continue with multiple configurations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview */}
            <div className="lg:sticky lg:top-8 h-fit">
              <DiggerProfileCard
                photoUrl={photoUrl}
                title={title}
                tagline={tagline}
                companyName={companyName}
                location={location}
                keywords={selectedIndustries}
                profession={profession}
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
