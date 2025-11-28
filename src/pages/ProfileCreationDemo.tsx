import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ProfileTitleTaglineEditor } from "@/components/ProfileTitleTaglineEditor";
import { DiggerProfileCard } from "@/components/DiggerProfileCard";
import { IndustryMultiSelector } from "@/components/IndustryMultiSelector";
import { Briefcase, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lookupCPC } from "@/utils/cpcLookup";
import { INDUSTRY_PRICING } from "@/config/pricing";

export default function ProfileCreationDemo() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState("");
  const [companyName, setCompanyName] = useState("Elite Home Services");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [location, setLocation] = useState("Los Angeles, CA");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["Kitchen Remodeling", "Bathroom Renovation", "Custom Cabinets"]);
  const [profession, setProfession] = useState("Home Remodeling Contractor");
  const [offersFreEstimates, setOffersFreEstimates] = useState(false);
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
          setOffersFreEstimates(profile.offers_free_estimates || false);
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

          <div className="grid lg:grid-cols-2 gap-8">
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
                    
                    {selectedIndustries.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <Label className="text-sm font-medium">Selected Keywords with Lead Types</Label>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                          {selectedIndustries.map((keyword) => {
                            const pricing = calculatePricing(keyword);
                            const nonExQty = getQuantity(keyword, 'nonExclusive');
                            const semiExQty = getQuantity(keyword, 'semiExclusive');
                            const ex24Qty = getQuantity(keyword, 'exclusive24h');
                            const grandTotal = (nonExQty * pricing.nonExclusive) + (semiExQty * pricing.semiExclusive) + (ex24Qty * pricing.exclusive24h);
                            
                            return (
                              <div key={keyword} className="rounded-lg border bg-card overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="text-left p-3 font-bold">{keyword}</th>
                                      <th className="text-left p-3 font-semibold">CPC ${pricing.googleCPC.toFixed(2)}</th>
                                      <th className="text-center p-3">Non Exclusive</th>
                                      <th className="text-center p-3">Semi-Exclusive</th>
                                      <th className="text-center p-3">Exclusive</th>
                                      <th className="text-right p-3"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b">
                                      <td className="p-3"></td>
                                      <td className="p-3 font-medium">Cost per Lead</td>
                                      <td className="text-center p-3">${pricing.nonExclusive.toFixed(2)}</td>
                                      <td className="text-center p-3">${pricing.semiExclusive.toFixed(2)}</td>
                                      <td className="text-center p-3">${pricing.exclusive24h.toFixed(2)}</td>
                                      <td className="p-3"></td>
                                    </tr>
                                    <tr className="border-b">
                                      <td className="p-3"></td>
                                      <td className="p-3 font-medium">No. of Leads</td>
                                      <td className="text-center p-3">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={nonExQty}
                                          onChange={(e) => updateQuantity(keyword, 'nonExclusive', parseInt(e.target.value) || 0)}
                                          className="w-20 h-9 text-center mx-auto"
                                        />
                                      </td>
                                      <td className="text-center p-3">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={semiExQty}
                                          onChange={(e) => updateQuantity(keyword, 'semiExclusive', parseInt(e.target.value) || 0)}
                                          className="w-20 h-9 text-center mx-auto"
                                        />
                                      </td>
                                      <td className="text-center p-3">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={ex24Qty}
                                          onChange={(e) => updateQuantity(keyword, 'exclusive24h', parseInt(e.target.value) || 0)}
                                          className="w-20 h-9 text-center mx-auto"
                                        />
                                      </td>
                                      <td className="text-right p-3 font-semibold">Total</td>
                                    </tr>
                                    <tr>
                                      <td className="p-3"></td>
                                      <td className="p-3 font-medium">Total</td>
                                      <td className="text-center p-3 font-semibold">${(nonExQty * pricing.nonExclusive).toFixed(2)}</td>
                                      <td className="text-center p-3 font-semibold">${(semiExQty * pricing.semiExclusive).toFixed(2)}</td>
                                      <td className="text-center p-3 font-semibold">${(ex24Qty * pricing.exclusive24h).toFixed(2)}</td>
                                      <td className="text-right p-3 font-bold text-primary">${grandTotal.toFixed(2)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Free Estimates Option */}
                  <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                    <Checkbox 
                      id="free_estimates" 
                      checked={offersFreEstimates}
                      onCheckedChange={(checked) => setOffersFreEstimates(checked === true)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="free_estimates" className="font-semibold cursor-pointer flex items-center gap-2">
                        Offer Free Estimates
                        <Badge variant="secondary" className="text-xs">Priority Placement</Badge>
                      </Label>
                      <div className="space-y-2 mt-2">
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          ⚠️ $50 charge per free estimate request (both exclusive & non-exclusive leads)
                        </p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">Benefits:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Priority placement in exclusive lead rotations</li>
                            <li>Higher conversion rates with clients</li>
                            <li>Build trust and credibility</li>
                            <li>Competitive advantage</li>
                          </ul>
                        </div>
                      </div>
                    </div>
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
                offersFreEstimates={offersFreEstimates}
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
