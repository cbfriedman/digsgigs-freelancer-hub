import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Star, DollarSign, Briefcase, Globe, Mail, MessageSquare, Loader2, Wallet, ShoppingCart, Clock, CheckCircle2, AlertTriangle, Edit, Phone, Camera, Sparkles, FileText, Search, MapPin } from "lucide-react";
import { RatingsList } from "@/components/RatingsList";
import { RichSnippetPreview } from "@/components/RichSnippetPreview";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { generateLocalBusinessSchema } from "@/components/StructuredData";
import { Breadcrumb } from "@/components/Breadcrumb";
import { OptimizedImage } from "@/components/OptimizedImage";
import { DiggerPricingSelector } from "@/components/DiggerPricingSelector";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";
import { ProfileClickPricingCard } from "@/components/ProfileClickPricingCard";
import { useProfileCallTracking } from "@/hooks/useProfileCallTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { BioGenerator } from "@/components/BioGenerator";
import { Textarea } from "@/components/ui/textarea";
import { ProfileHeader, ProfileAbout, WorkSamplesGallery, QuickContactCard, ReferencesSection } from "@/components/digger-profile";

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

interface LeadPurchase {
  id: string;
  gig_id: string;
  purchase_price: number;
  amount_paid: number;
  exclusivity_type: string | null;
  status: string | null;
  purchased_at: string;
  gig: {
    title: string;
    description: string;
    is_confirmed_lead: boolean | null;
  } | null;
}

interface LeadBalance {
  balance: number;
  total_deposited: number;
  total_spent: number;
}

interface Digger {
  id: string;
  user_id: string;
  handle: string | null;
  business_name: string;
  profession: string;
  profile_name?: string | null;
  tagline: string | null;
  availability: string | null;
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
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const { isOnline } = useDiggerPresence(id);
  const { recordCall, isRecording: isCallingDigger } = useProfileCallTracking();
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  
  // Owner dashboard states
  const [leadPurchases, setLeadPurchases] = useState<LeadPurchase[]>([]);
  const [leadBalance, setLeadBalance] = useState<LeadBalance | null>(null);
  const [totalLeadsSold, setTotalLeadsSold] = useState(0);

  // People also viewed (related diggers)
  const [relatedDiggers, setRelatedDiggers] = useState<{ id: string; business_name: string; profession: string | null; profile_image_url: string | null; custom_occupation_title: string | null }[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  // Fetch related diggers for "People also viewed" when viewing another's profile
  useEffect(() => {
    if (!id || !digger || isOwnProfile) return;
    const loadRelated = async () => {
      const profession = digger.profession || '';
      const categoryIds = (digger.digger_categories || []).map((dc: { categories?: { name: string } }) => dc.categories?.name).filter(Boolean);
      const { data } = await supabase
        .from("digger_profiles")
        .select("id, business_name, profession, profile_image_url, custom_occupation_title")
        .neq("id", id)
        .limit(8);
      if (data?.length) setRelatedDiggers(data);
    };
    loadRelated();
  }, [id, digger, isOwnProfile]);

  const loadData = async () => {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user || null);

    // Check if user is a digger trying to view another digger's profile
    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .single();
      
      // If user is a digger, check if they're viewing their own profile
      if (profile?.user_type === "digger") {
        const { data: diggerProfile } = await supabase
          .from("digger_profiles")
          .select("user_id")
          .eq("id", id)
          .single();
        
        // Block if digger is trying to view another digger's profile
        if (diggerProfile && diggerProfile.user_id !== session.user.id) {
          toast.error("Diggers cannot view other Diggers' profiles. The marketplace is currently closed and curated.");
          navigate("/");
          return;
        }
      }
    }

    // Fetch digger data first
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
      navigate("/");
      return;
    }

    setDigger(diggerData);
    setIsOwnProfile(session?.user?.id === diggerData.user_id);

    // Record profile click when a non-owner views (for analytics)
    if (session?.user?.id !== diggerData.user_id) {
      try {
        await supabase.functions.invoke('record-profile-click', {
          body: { digger_profile_id: id }
        });
      } catch (error) {
        console.error('Failed to record click:', error);
      }
    }

    // Check if user has already paid to view this profile
    if (session?.user) {
      try {
        const { data: profileView, error: profileViewError } = await supabase
          .from("profile_views")
          .select("*")
          .eq("consumer_id", session.user.id)
          .eq("digger_id", id)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle cases where no record exists
        
        if (profileViewError && profileViewError.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is expected - ignore it
          console.error('Error checking profile view access:', profileViewError);
        }
        
        setHasViewAccess(!!profileView);
      } catch (error) {
        // Silently fail - view access check shouldn't block page load
        console.error('Failed to check profile view access:', error);
        setHasViewAccess(false);
      }
    }

    const { data: referencesData } = await supabase
      .from("references")
      .select("*")
      .eq("digger_id", id);

    setReferences(referencesData || []);
    setLoading(false);

    // Track ViewContent event for Facebook Pixel
    if (fbConfigured && diggerData) {
      trackFBEvent('ViewContent', {
        content_name: diggerData.business_name || diggerData.profession,
        content_ids: [diggerData.id],
        content_type: 'digger_profile',
        value: diggerData.hourly_rate || diggerData.hourly_rate_min || 0,
        currency: 'USD',
      });
    }

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

    // Load owner-specific data if viewing own profile
    if (session?.user?.id === diggerData.user_id) {
      // Fetch lead purchases
      const { data: purchasesData } = await supabase
        .from("lead_purchases")
        .select(`
          id,
          gig_id,
          purchase_price,
          amount_paid,
          exclusivity_type,
          status,
          purchased_at,
          gig:gigs(title, description, is_confirmed_lead)
        `)
        .eq("digger_id", id)
        .order("purchased_at", { ascending: false });

      if (purchasesData) {
        setLeadPurchases(purchasesData.map(p => ({
          ...p,
          gig: Array.isArray(p.gig) ? p.gig[0] : p.gig
        })));
        setTotalLeadsSold(purchasesData.filter(p => p.status === "completed").length);
      }

      // Fetch lead balance
      try {
        const { data: balanceData, error: balanceError } = await supabase
          .from("digger_lead_balance")
          .select("balance, total_deposited, total_spent")
          .eq("digger_id", id)
          .maybeSingle(); // Use maybeSingle() instead of single() - balance might not exist yet

        if (balanceError && balanceError.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is expected for new diggers - ignore it
          console.error('Error fetching lead balance:', balanceError);
        }

        if (balanceData) {
          setLeadBalance(balanceData);
        }
      } catch (error) {
        // Silently fail - balance fetch shouldn't block page load
        console.error('Failed to fetch lead balance:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error("Please sign in to send messages");
      navigate("/register");
      return;
    }

    if (!digger) return;

    try {
      // Check if conversation already exists with this digger
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("digger_id", digger.id)
        .eq("consumer_id", currentUser.id)
        .maybeSingle();

      if (existingConv && existingConv.id) {
        navigate(`/messages?conversation=${existingConv.id}`);
        return;
      }

      // Create new conversation without a specific gig
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          digger_id: digger.id,
          consumer_id: currentUser.id,
          gig_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      if (newConv && newConv.id) {
        toast.success("Conversation started!");
        navigate(`/messages?conversation=${newConv.id}`);
      } else {
        throw new Error("Failed to create conversation");
      }
    } catch (error: any) {
      toast.error("Error starting conversation: " + error.message);
    }
  };

  const handleRequestReferenceContact = async (referenceId: string) => {
    if (!currentUser) {
      toast.error("Please sign in to request reference contact");
      navigate("/register");
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

  const handleCallDigger = async () => {
    if (!currentUser) {
      toast.error("Please sign in to call this digger");
      navigate("/register");
      return;
    }

    if (!digger || !id) return;

    // Record the call (this charges the digger, not the caller)
    const result = await recordCall(id);
    
    if (result.success) {
      // Open the phone dialer with the digger's phone number
      window.location.href = `tel:${digger.phone}`;
    }
  };

  const handleUnlockContact = async () => {
    if (!currentUser) {
      toast.error("Please sign in to view contact information");
      navigate("/register");
      return;
    }

    if (!digger) return;

    setIsUnlocking(true);
    try {
      const data = await invokeEdgeFunction<{
        requiresGig?: boolean;
        notRelated?: boolean;
        alreadyPaid?: boolean;
        success?: boolean;
        message?: string;
        url?: string;
        totalCharge?: number;
        viewFee?: number;
        leadCost?: number;
      }>(supabase, "charge-profile-view", {
        body: { diggerId: digger.id },
      });

      // Handle access denied responses
      if (data.requiresGig) {
        toast.error("You must post at least one gig before you can view digger profiles.");
        navigate("/post-gig");
        return;
      }

      if (data.notRelated) {
        toast.error("You can only view diggers that are related to your posted gigs.");
        return;
      }

      if (data.alreadyPaid || data.success) {
        setHasViewAccess(true);
        toast.success(data.message || "Contact information unlocked! The digger has been charged.");
        
        // Track custom event for contact reveal
        if (fbConfigured) {
          try {
            const win = window as any;
            if (win.fbq) {
              win.fbq('trackCustom', 'ContactRevealed', {
                digger_id: digger.id,
                digger_profile_id: digger.id,
                consumer_id: currentUser?.id,
              });
            }
          } catch (error) {
            console.warn('Facebook Pixel: Error tracking ContactRevealed event', error);
          }
        }
        
        // Reload data to refresh view access
        await loadData();
      } else if (data.url) {
        // Redirect to Stripe checkout (legacy flow - shouldn't happen with new subscription model)
        window.open(data.url, '_blank');
        toast.info(`Total charge: $${data.totalCharge} ($${data.viewFee} view fee + $${data.leadCost} lead cost)`);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error unlocking contact:", error);
      }
      const msg = error?.message ?? "";
      if (msg.includes("must post") || msg.includes("not related")) {
        toast.error(msg || "You can only view diggers related to your posted gigs.");
        if (msg.includes("must post")) {
          navigate("/post-gig");
        }
      } else {
        toast.error(msg || "Failed to unlock contact information");
      }
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
    // First priority: profile_name or business_name (user-defined profile names)
    const profileName = digger?.profile_name || digger?.business_name;
    if (profileName && profileName !== 'Not specified') {
      return profileName;
    }
    
    // Second priority: custom occupation title
    if (digger?.custom_occupation_title) {
      const titles = digger.custom_occupation_title.split(", ");
      const primaryIndex = digger.primary_profession_index || 0;
      return titles[primaryIndex] || titles[0] || digger.custom_occupation_title;
    }
    
    // Fallback: profession field
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

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8 lg:py-12 max-w-5xl">
        <div className="sticky top-14 sm:top-16 z-10 bg-background py-2 sm:py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-4 sm:-mt-6 md:-mt-8 lg:-mt-12 mb-3 sm:mb-4">
          <Breadcrumb 
            items={[
              { label: "Browse Diggers", href: "/browse-diggers" },
              { label: digger.business_name, href: `/digger/${digger.id}` }
            ]} 
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main content - Himalayas-style left column */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1 min-w-0">
            {!isOwnProfile ? (
              <>
                {/* Centered profile header - name, handle, tagline, location */}
                <Card className="overflow-hidden">
                  <CardContent className="p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-primary/20 mb-4">
                        <AvatarImage src={digger.profile_image_url || undefined} alt={digger.business_name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                          {(digger.business_name || digger.profile_name || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                        {!hasViewAccess ? (digger.business_name || digger.profile_name || "").split(" ").map(w => w.charAt(0) + ".").join("") + "." : (digger.business_name || digger.profile_name || digger.profiles?.full_name || "Professional")}
                      </h1>
                      {digger.handle && (
                        <p className="text-muted-foreground text-sm sm:text-base mb-2">@{digger.handle}</p>
                      )}
                      <p className="text-lg text-muted-foreground max-w-xl mb-3">
                        {digger.tagline || getDisplayProfession()}
                      </p>
                      {digger.country && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-xl">{getCountryFlag(digger.country)}</span>
                          <span>{[digger.location, digger.country].filter(Boolean).join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* What I offer - short pitch (tagline) */}
                {digger.tagline && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">What I offer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{digger.tagline}</p>
                    </CardContent>
                  </Card>
                )}

                {/* About / Professional summary */}
                {digger.bio && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        About
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{digger.bio}</p>
                      {digger.offers_free_estimates && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg text-sm font-medium">
                          ✓ Offers Free Estimates
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Skills & expertise - badge grid */}
                {((digger.skills?.length ?? 0) > 0 || (digger.digger_categories?.length ?? 0) > 0) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Skills & expertise</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(digger.digger_categories || []).map((dc, idx) => (
                          <Badge key={`cat-${idx}`} variant="default" className="px-3 py-1">
                            {dc.categories?.name || ""}
                          </Badge>
                        ))}
                        {(digger.skills || []).map((skill, idx) => (
                          <Badge key={`skill-${idx}`} variant="secondary" className="px-3 py-1">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <WorkSamplesGallery photos={digger.work_photos || []} businessName={digger.business_name} />
                <ReferencesSection references={references} />

                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Star className="h-5 w-5 text-primary shrink-0" />
                      Reviews & ratings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <RatingsList diggerId={id!} isDigger={false} diggerName={digger.business_name} />
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Owner View - Original detailed management interface */
              <>
              <Card>
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div className="relative shrink-0">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                      <AvatarImage src={digger.profile_image_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {getInitials(digger.handle)}
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && !digger.profile_image_url && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                        onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}
                        title="Add profile photo"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h1 className="text-2xl sm:text-3xl font-bold break-words">
                        {digger.business_name || digger.profile_name || digger.profiles?.full_name || "Business Name"}
                      </h1>
                      <div className="flex items-center gap-1.5 bg-background border border-border/50 px-3 py-1 rounded-full">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
                        <span className="text-sm font-medium">
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <p className="text-lg sm:text-xl text-muted-foreground">{getDisplayProfession()}</p>
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
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-accent text-accent shrink-0" />
                        <span className="font-semibold text-base sm:text-lg">{digger.average_rating.toFixed(1)}</span>
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

                {/* Bio Section - Show for all, with edit option for owners */}
                <Separator className="my-6" />
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    About My Services
                  </h2>
                  {digger.bio ? (
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{digger.bio}</p>
                  ) : isOwnProfile ? (
                    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">Add a professional bio to help clients learn about your services</p>
                      <Button onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Add Bio with AI Assistance
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No bio provided yet.</p>
                  )}
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
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

                {/* References Section */}
                <Separator className="my-6" />
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    📋 Prior Job References
                  </h2>
                  {references.length > 0 ? (
                    <div className="space-y-3">
                      {references.map((ref) => (
                        <div key={ref.id} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{ref.reference_name}</p>
                              {ref.project_description && (
                                <p className="text-sm text-muted-foreground mt-1">{ref.project_description}</p>
                              )}
                            </div>
                            {ref.is_verified && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isOwnProfile ? (
                    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <p className="text-muted-foreground mb-4">Add references from past clients to build trust</p>
                      <p className="text-sm text-muted-foreground">Reference management coming soon</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No references provided yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reviews for Owner */}
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Reviews & Ratings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <RatingsList 
                  diggerId={id!} 
                  isDigger={true}
                  diggerName={digger.business_name}
                />
              </CardContent>
            </Card>
          </>
            )}
          </div>

          {/* Sidebar - order first on mobile so actions are visible without scrolling */}
          <div className="lg:col-span-1 order-1 lg:order-2 min-w-0">
            <div className="space-y-4 sm:space-y-6 sticky top-20 sm:top-24 z-10 bg-background pb-4 lg:pb-0">
              {!isOwnProfile && (
                <>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                        <span className="text-sm font-medium">
                          {isOnline ? "Open to opportunities" : "Currently offline"}
                        </span>
                      </div>
                      {digger.country && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{[digger.location, digger.country].filter(Boolean).join(", ")}</span>
                        </div>
                      )}
                      {digger.portfolio_url && (
                        <a href={digger.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <Globe className="h-4 w-4 shrink-0" />
                          Portfolio
                        </a>
                      )}
                      {formatHourlyRate() && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{formatHourlyRate()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {(digger.digger_categories?.length ?? 0) > 0 && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">Job categories</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          {(digger.digger_categories || []).map((dc, idx) => (
                            <li key={idx}>{dc.categories?.name || ""}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {(digger.skills?.length ?? 0) > 0 && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">Skills</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {(digger.skills || []).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="font-normal text-xs">{skill}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <QuickContactCard
                    hasViewAccess={hasViewAccess}
                    isUnlocking={isUnlocking}
                    isCallingDigger={isCallingDigger}
                    phone={digger.phone}
                    offersFreEstimates={digger.offers_free_estimates}
                    hourlyRateDisplay={formatHourlyRate()}
                    onSendMessage={handleSendMessage}
                    onCallDigger={handleCallDigger}
                    onUnlockContact={handleUnlockContact}
                  />

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
                  {relatedDiggers.length > 0 && (
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium">People also viewed</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4">
                        <ul className="space-y-3">
                          {relatedDiggers.slice(0, 6).map((d) => (
                            <li key={d.id}>
                              <button
                                type="button"
                                onClick={() => navigate(`/digger/${d.id}`)}
                                className="flex items-center gap-3 w-full text-left rounded-lg p-2 -mx-2 hover:bg-accent/50 transition-colors"
                              >
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarImage src={d.profile_image_url || undefined} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {(d.business_name || "?").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{d.business_name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {d.custom_occupation_title || d.profession || "Professional"}
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate("/browse-diggers")}>
                          View all talent
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {isOwnProfile && (
                <>
                  {/* Lead Stats */}
                  <Card>
                    <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        Lead Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <div className="bg-primary/10 rounded-lg p-2 sm:p-3 text-center min-w-0">
                          <div className="text-base sm:text-lg md:text-xl font-bold text-primary truncate" title={String(totalLeadsSold)}>{totalLeadsSold}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">Completed</div>
                        </div>
                        <div className="bg-yellow-500/10 rounded-lg p-2 sm:p-3 text-center min-w-0">
                          <div className="text-base sm:text-lg md:text-xl font-bold text-yellow-600 truncate" title={String(leadPurchases.filter(p => p.status === 'pending').length)}>
                            {leadPurchases.filter(p => p.status === 'pending').length}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">Pending</div>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-2 sm:p-3 text-center min-w-0">
                          <div className="text-sm sm:text-base md:text-lg font-bold text-green-600 truncate" title={`$${leadBalance?.balance?.toFixed(2) || '0.00'}`}>
                            ${leadBalance?.balance?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">Balance</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3">
                      <Button
                        className="w-full min-h-10 sm:min-h-11"
                        size="sm"
                        onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Edit Profile</span>
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full min-h-10 sm:min-h-11"
                        size="sm"
                        onClick={() => navigate('/checkout')}
                      >
                        <Wallet className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Add Funds</span>
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full min-h-10 sm:min-h-11"
                        size="sm"
                        onClick={() => navigate(`/keyword-summary?profileId=${id}`)}
                      >
                        <Search className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Browse Leads</span>
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        Account balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="text-lg sm:text-xl font-bold text-primary mb-1 truncate" title={`$${leadBalance?.balance?.toFixed(2) ?? '0.00'}`}>
                        ${leadBalance?.balance?.toFixed(2) ?? '0.00'}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">Available for lead purchases</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate('/checkout')}
                      >
                        Add funds
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500 shrink-0" />
                        Pending purchases
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-3 sm:px-4 pb-3 sm:pb-4">
                      {leadPurchases.filter(p => p.status === 'pending').length > 0 ? (
                        <>
                          <p className="text-sm font-semibold text-yellow-600 mb-2">
                            {leadPurchases.filter(p => p.status === 'pending').length} pending
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate('/checkout')}
                          >
                            View & complete
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">No pending purchases</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4">
                      <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                        Purchased leads
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 px-3 sm:px-4 pb-3 sm:pb-4">
                      <p className="text-sm font-semibold text-green-600 mb-1">{totalLeadsSold} leads</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">View and manage your leads</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/my-leads?profileId=${id}`)}
                      >
                        View all leads
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

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
      <Footer />
    </div>
  );
};

export default DiggerDetail;