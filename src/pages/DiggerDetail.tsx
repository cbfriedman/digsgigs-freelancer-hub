import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Star, DollarSign, Briefcase, Globe, Mail, MessageSquare, Loader2 } from "lucide-react";
import { RatingsList } from "@/components/RatingsList";
import { RichSnippetPreview } from "@/components/RichSnippetPreview";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";
import { generateLocalBusinessSchema } from "@/components/StructuredData";
import { Breadcrumb } from "@/components/Breadcrumb";
import { OptimizedImage } from "@/components/OptimizedImage";
import { DiggerPricingSelector } from "@/components/DiggerPricingSelector";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";

interface Reference {
  id: string;
  reference_name: string;
  reference_email: string;
  reference_phone: string | null;
  project_description: string | null;
  is_verified: boolean;
}

interface ReferenceRequest {
  id: string;
  status: string;
}

interface Digger {
  id: string;
  user_id: string;
  handle: string | null;
  business_name: string;
  profession: string;
  bio: string | null;
  location: string;
  phone: string;
  hourly_rate: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  years_experience: number | null;
  average_rating: number;
  total_ratings: number;
  profile_image_url: string | null;
  portfolio_url: string | null;
  work_photos: string[] | null;
  skills: string[] | null;
  completion_rate: number | null;
  response_time_hours: number | null;
  is_insured: boolean;
  is_bonded: boolean;
  is_licensed: string;
  sic_code: string[] | null;
  naics_code: string[] | null;
  custom_occupation_title: string | null;
  primary_profession_index: number | null;
  location_lat: number | null;
  location_lng: number | null;
  pricing_model: string | null;
  subscription_tier: string | null;
  offers_free_estimates: boolean | null;
  country: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
  digger_categories: {
    categories: {
      name: string;
      description: string | null;
    };
  }[];
}

const DiggerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [digger, setDigger] = useState<Digger | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [referenceRequests, setReferenceRequests] = useState<Record<string, ReferenceRequest>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasViewAccess, setHasViewAccess] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { isOnline } = useDiggerPresence(id);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user || null);

    // Check if user has already paid to view this profile
    if (session?.user) {
      const { data: profileView } = await supabase
        .from("profile_views")
        .select("*")
        .eq("consumer_id", session.user.id)
        .eq("digger_id", id)
        .single();
      
      setHasViewAccess(!!profileView);
    }

    const { data: diggerData, error: diggerError } = await supabase
      .from("digger_profiles")
      .select(`
        *,
        profiles!digger_profiles_user_id_fkey (full_name, email),
        digger_categories (
          categories (name, description)
        )
      `)
      .eq("id", id)
      .single();

    if (diggerError || !diggerData) {
      toast.error("Digger not found");
      navigate("/browse-diggers");
      return;
    }

    setDigger(diggerData);

    const { data: referencesData } = await supabase
      .from("references")
      .select("*")
      .eq("digger_id", id);

    setReferences(referencesData || []);
    setLoading(false);

    // Load reference contact requests if user is logged in
    if (session?.user) {
      const { data: requestsData } = await supabase
        .from("reference_contact_requests")
        .select("id, reference_id, status")
        .eq("consumer_id", session.user.id);
      
      if (requestsData) {
        const requestsMap: Record<string, ReferenceRequest> = {};
        requestsData.forEach((req: any) => {
          requestsMap[req.reference_id] = { id: req.id, status: req.status };
        });
        setReferenceRequests(requestsMap);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error("Please sign in to send messages");
      navigate("/auth");
      return;
    }

    if (!digger) return;

    try {
      // Check if conversation already exists with this digger
      const { data: existingConv } = await supabase
        .from("conversations" as any)
        .select("id")
        .eq("digger_id", digger.id)
        .eq("consumer_id", currentUser.id)
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages?conversation=${(existingConv as any).id}`);
        return;
      }

      // Create new conversation without a specific gig
      const { data: newConv, error } = await supabase
        .from("conversations" as any)
        .insert({
          digger_id: digger.id,
          consumer_id: currentUser.id,
          gig_id: null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("Conversation started!");
      navigate(`/messages?conversation=${(newConv as any).id}`);
    } catch (error: any) {
      toast.error("Error starting conversation: " + error.message);
    }
  };

  const handleRequestReferenceContact = async (referenceId: string) => {
    if (!currentUser) {
      toast.error("Please sign in to request reference contact");
      navigate("/auth");
      return;
    }

    if (!digger) return;

    try {
      const { error } = await supabase
        .from("reference_contact_requests")
        .insert({
          reference_id: referenceId,
          consumer_id: currentUser.id,
          digger_id: digger.id,
        });

      if (error) throw error;

      toast.success("Request sent! The digger will be notified.");
      
      // Reload data to update request status
      loadData();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("You've already requested this reference contact");
      } else {
        toast.error("Failed to send request");
      }
    }
  };

  const handleUnlockContact = async () => {
    if (!currentUser) {
      toast.error("Please sign in to view contact information");
      navigate("/auth");
      return;
    }

    if (!digger) return;

    setIsUnlocking(true);
    try {
      const { data, error } = await supabase.functions.invoke("charge-profile-view", {
        body: { diggerId: digger.id },
      });

      if (error) throw error;

      if (data.alreadyPaid) {
        setHasViewAccess(true);
        toast.success(data.message);
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.open(data.url, '_blank');
        toast.info(`Total charge: $${data.totalCharge} ($${data.viewFee} view fee + $${data.leadCost} lead cost)`);
      }
    } catch (error: any) {
      console.error("Error unlocking contact:", error);
      toast.error(error.message || "Failed to unlock contact information");
    } finally {
      setIsUnlocking(false);
    }
  };

  const getCountryFlag = (countryName: string): string => {
    const flags: { [key: string]: string } = {
      "United States": "🇺🇸",
      "Canada": "🇨🇦",
      "United Kingdom": "🇬🇧",
      "Australia": "🇦🇺",
      "Germany": "🇩🇪",
      "France": "🇫🇷",
      "Spain": "🇪🇸",
      "Italy": "🇮🇹",
      "Mexico": "🇲🇽",
      "Brazil": "🇧🇷",
      "India": "🇮🇳",
      "China": "🇨🇳",
      "Japan": "🇯🇵",
      "South Korea": "🇰🇷",
      "Netherlands": "🇳🇱",
      "Sweden": "🇸🇪",
      "Norway": "🇳🇴",
      "Denmark": "🇩🇰",
      "Finland": "🇫🇮",
      "Poland": "🇵🇱",
      "Ireland": "🇮🇪",
      "Switzerland": "🇨🇭",
      "Austria": "🇦🇹",
      "Belgium": "🇧🇪",
      "Portugal": "🇵🇹",
      "Greece": "🇬🇷",
      "New Zealand": "🇳🇿",
      "Singapore": "🇸🇬",
      "South Africa": "🇿🇦",
      "Argentina": "🇦🇷",
      "Chile": "🇨🇱",
      "Colombia": "🇨🇴",
      "Peru": "🇵🇪",
      "Israel": "🇮🇱",
      "UAE": "🇦🇪",
      "Saudi Arabia": "🇸🇦",
      "Turkey": "🇹🇷",
      "Thailand": "🇹🇭",
      "Vietnam": "🇻🇳",
      "Philippines": "🇵🇭",
      "Indonesia": "🇮🇩",
      "Malaysia": "🇲🇾",
      "Egypt": "🇪🇬",
      "Nigeria": "🇳🇬",
      "Kenya": "🇰🇪",
      "Other": "🌍"
    };
    return flags[countryName] || "🌍";
  };

  const getInitials = (handle: string | null) => {
    if (!handle) return "DG";
    return handle.slice(0, 2).toUpperCase();
  };

  const formatHourlyRate = () => {
    if (digger?.hourly_rate_min && digger?.hourly_rate_max) {
      return `$${digger.hourly_rate_min}-${digger.hourly_rate_max}/hr`;
    }
    if (digger?.hourly_rate) {
      return `$${digger.hourly_rate}/hr`;
    }
    return null;
  };

  const getDisplayProfession = () => {
    // If we have a custom occupation title, use it
    if (digger?.custom_occupation_title) {
      const titles = digger.custom_occupation_title.split(", ");
      const primaryIndex = digger.primary_profession_index || 0;
      // Return the primary profession if valid index, otherwise return first
      return titles[primaryIndex] || titles[0] || digger.custom_occupation_title;
    }
    
    // Otherwise, fetch from industry codes based on primary index
    const primaryIndex = digger?.primary_profession_index || 0;
    const allCodes = [
      ...(digger?.sic_code || []),
      ...(digger?.naics_code || [])
    ];
    
    if (allCodes.length > primaryIndex) {
      // This will be resolved by getOccupationBadge
      return digger?.profession || "";
    }
    
    return digger?.profession || "";
  };

  const getOccupationBadge = () => {
    const primaryIndex = digger?.primary_profession_index || 0;
    
    // Combine SIC and NAICS codes to respect primary index
    const allCodes = [
      ...(digger?.sic_code || []).map(code => ({ type: "SIC", code })),
      ...(digger?.naics_code || []).map(code => ({ type: "NAICS", code }))
    ];
    
    if (allCodes.length > 0) {
      const primaryCode = allCodes[primaryIndex] || allCodes[0];
      return { 
        label: `${primaryCode.type} Code`, 
        value: primaryCode.code,
        isPrimary: primaryIndex < allCodes.length
      };
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <h1 
              className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate("/")}
            >
              digsandgigs
            </h1>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!digger) return null;

  const displayProfession = getDisplayProfession();
  const occupationBadge = getOccupationBadge();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${digger.business_name} - ${displayProfession} in ${digger.location}`}
        description={`${digger.bio || `Professional ${displayProfession} services in ${digger.location}`}. ${digger.average_rating ? `Rated ${digger.average_rating}/5 stars` : 'Available for hire'}. ${digger.hourly_rate ? `Starting at $${digger.hourly_rate}/hour` : 'Contact for pricing'}.`}
        keywords={`${displayProfession}, ${digger.location}, contractor, service professional, ${digger.skills?.join(', ') || ''}`}
        ogType="profile"
        ogImage={digger.profile_image_url || undefined}
        structuredData={generateLocalBusinessSchema({
          name: digger.business_name,
          description: digger.bio || `Professional ${displayProfession} services`,
          url: window.location.href,
          telephone: digger.phone,
          address: {
            addressLocality: digger.location
          },
          geo: digger.location_lat && digger.location_lng ? {
            latitude: digger.location_lat,
            longitude: digger.location_lng
          } : undefined,
          priceRange: digger.hourly_rate ? `$${digger.hourly_rate}+` : undefined,
          aggregateRating: digger.average_rating ? {
            ratingValue: digger.average_rating,
            reviewCount: digger.total_ratings || 0
          } : undefined,
          image: digger.profile_image_url || undefined
        })}
      />
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgigs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/browse-diggers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Browse
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <Breadcrumb 
          items={[
            { label: "Browse Diggers", href: "/browse-diggers" },
            { label: digger.business_name, href: `/digger/${digger.id}` }
          ]} 
        />
        
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-start gap-6 mb-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={digger.profile_image_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {getInitials(digger.handle)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold">
                        @{digger.handle || "anonymous"}
                      </h1>
                      <div className="flex items-center gap-1.5 bg-background border border-border/50 px-3 py-1 rounded-full">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
                        <span className="text-sm font-medium">
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xl text-muted-foreground">{getDisplayProfession()}</p>
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Primary Specialty
                        </Badge>
                      </div>
                      {occupationBadge && (
                        <Badge variant="outline" className="mt-2">
                          {occupationBadge.label}: {occupationBadge.value}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-accent text-accent" />
                        <span className="font-semibold text-lg">{digger.average_rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({digger.total_ratings} reviews)</span>
                      </div>
                      {formatHourlyRate() && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">{formatHourlyRate()}</span>
                        </div>
                      )}
                      {digger.years_experience && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                          <span>{digger.years_experience} years experience</span>
                        </div>
                      )}
                      {digger.country && (
                        <div className="flex items-center gap-1">
                          <span className="text-lg">{getCountryFlag(digger.country)}</span>
                          <span>{digger.country}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {digger.is_insured && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                          ✓ Insured
                        </Badge>
                      )}
                      {digger.is_bonded && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                          ✓ Bonded
                        </Badge>
                      )}
                      {digger.is_licensed === 'yes' && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                          ✓ Licensed
                        </Badge>
                      )}
                      {digger.is_licensed === 'no' && (
                        <Badge variant="secondary" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                          Not Licensed
                        </Badge>
                      )}
                      {digger.completion_rate !== null && (
                        <Badge variant="secondary">
                          {digger.completion_rate}% Completion Rate
                        </Badge>
                      )}
                      {digger.response_time_hours !== null && (
                        <Badge variant="secondary">
                          Responds in {digger.response_time_hours}h
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {digger.bio && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">About My Services</h2>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{digger.bio}</p>
                    </div>
                  </>
                )}

                <Separator className="my-6" />
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing & Work Options
                  </h2>
                  <div className="space-y-3">
                    {digger.pricing_model === 'fixed' && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Fixed Price Contracts</p>
                          <p className="text-sm text-muted-foreground mt-1">I work on a project basis with fixed pricing agreed upfront</p>
                        </div>
                      </div>
                    )}
                    {(digger.pricing_model === 'hourly' || digger.pricing_model === 'both') && formatHourlyRate() && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Hourly Rate: {formatHourlyRate()}</p>
                          <p className="text-sm text-muted-foreground mt-1">Available for time and materials projects billed by the hour</p>
                        </div>
                      </div>
                    )}
                    {digger.pricing_model === 'both' && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Fixed Price Contracts Also Available</p>
                          <p className="text-sm text-muted-foreground mt-1">Flexible pricing options - choose what works best for your project</p>
                        </div>
                      </div>
                    )}
                    {digger.offers_free_estimates && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <div className="mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-green-600" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-400">Free Estimates Available</p>
                          <p className="text-sm text-muted-foreground mt-1">Get a no-obligation project estimate and consultation at no cost</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(digger.digger_categories?.length ?? 0) > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Skills & Expertise</h2>
                      <div className="flex flex-wrap gap-2">
                        {(digger.digger_categories || []).map((dc, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                            {dc.categories?.name || ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {digger.work_photos && digger.work_photos.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Work Samples</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {digger.work_photos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                            <OptimizedImage
                              src={photo}
                              alt={`Work sample ${idx + 1} by ${digger.business_name}`}
                              width={300}
                              height={300}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {digger.portfolio_url && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Portfolio</h2>
                      <a 
                        href={digger.portfolio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Globe className="h-4 w-4" />
                        View Portfolio
                      </a>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Hourly Upcharge Display */}
            {(digger.hourly_rate_min || digger.hourly_rate_max) && (
              <HourlyUpchargeDisplay
                hourlyRateMin={digger.hourly_rate_min}
                hourlyRateMax={digger.hourly_rate_max}
                subscriptionTier={digger.subscription_tier}
                variant="default"
              />
            )}

            {/* Contact Info Unlock Section */}
            {!hasViewAccess && currentUser && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔒 Contact Information Locked
                  </CardTitle>
                  <CardDescription>
                    Unlock this digger's full contact information to connect directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Profile View Fee ({digger.subscription_tier || 'free'} tier):</span>
                      <span className="font-semibold">
                        ${digger.subscription_tier === 'premium' ? '75' : digger.subscription_tier === 'pro' ? '100' : '125'}.00
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Lead Access Fee ({digger.subscription_tier || 'free'} tier):</span>
                      <span className="font-semibold">
                        ${digger.subscription_tier === 'premium' ? '5' : digger.subscription_tier === 'pro' ? '10' : '20'}.00
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span className="text-primary">
                        ${digger.subscription_tier === 'premium' ? '80' : digger.subscription_tier === 'pro' ? '110' : '145'}.00
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleUnlockContact}
                    disabled={isUnlocking}
                  >
                    {isUnlocking ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        🔓 Unlock Contact Information
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    One-time payment to view phone, email, and send proposals
                  </p>
                </CardContent>
              </Card>
            )}

            {hasViewAccess && (
              <DiggerPricingSelector
                diggerId={digger.id}
                gigId={id || ''}
                pricingModel={digger.pricing_model || 'both'}
                subscriptionTier={digger.subscription_tier || 'free'}
                hourlyRateMin={digger.hourly_rate_min}
                hourlyRateMax={digger.hourly_rate_max}
                offersFreEstimates={digger.offers_free_estimates}
                businessName={digger.business_name}
                onSelectPricing={(model) => {
                  toast.success(`Lead purchased successfully! You can now contact ${digger.business_name}`);
                }}
              />
            )}

            {references.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Client References</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {references.map((ref) => {
                    const request = referenceRequests[ref.id];
                    const canShowContact = request?.status === 'approved';
                    
                    return (
                      <div key={ref.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold">{ref.reference_name}</h3>
                            <p className="text-sm text-muted-foreground italic">Reference verified by platform</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ref.is_verified && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        {ref.project_description && (
                          <p className="text-sm text-muted-foreground mt-2">{ref.project_description}</p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Reviews & Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <RatingsList 
                  diggerId={id!} 
                  isDigger={currentUser?.id === digger.user_id}
                  diggerName={digger.business_name}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-24">
              <Card>
                <CardContent className="p-6">
                  <Button 
                    className="w-full mb-4" 
                    size="lg"
                    onClick={handleSendMessage}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Send Message
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Start a conversation to discuss your project with this digger
                  </p>
                </CardContent>
              </Card>

              {/* Google Search Preview */}
              {digger.total_ratings > 0 && (
                <RichSnippetPreview
                  businessName={digger.business_name}
                  rating={digger.average_rating}
                  reviewCount={digger.total_ratings}
                  priceRange={formatHourlyRate() || undefined}
                  location={digger.location}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiggerDetail;