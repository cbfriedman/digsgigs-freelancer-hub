import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Star, DollarSign, Briefcase, Globe, Mail, MessageSquare, Loader2, Wallet, ShoppingCart, Clock, CheckCircle2, AlertTriangle, Edit, Phone, Camera, Sparkles, FileText } from "lucide-react";
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
import { LeadReturnDialog } from "@/components/LeadReturnDialog";
import { ProfileClickPricingCard } from "@/components/ProfileClickPricingCard";
import { useProfileCallTracking } from "@/hooks/useProfileCallTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { BioGenerator } from "@/components/BioGenerator";
import { Textarea } from "@/components/ui/textarea";

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
  const [diggerNeedsSubscription, setDiggerNeedsSubscription] = useState(false);
  const { isOnline } = useDiggerPresence(id);
  const { recordCall, isRecording: isCallingDigger } = useProfileCallTracking();
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  
  // Owner dashboard states
  const [leadPurchases, setLeadPurchases] = useState<LeadPurchase[]>([]);
  const [leadBalance, setLeadBalance] = useState<LeadBalance | null>(null);
  const [totalLeadsSold, setTotalLeadsSold] = useState(0);

  useEffect(() => {
    loadData();
  }, [id]);

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

    // Check subscription status
    const subscriptionStatus = diggerData.subscription_status;
    setDiggerNeedsSubscription(subscriptionStatus !== 'active');

    // Record click if digger is subscribed (for price lock tracking)
    // Only record if not the digger viewing their own profile
    if (subscriptionStatus === 'active' && session?.user?.id !== diggerData.user_id) {
      try {
        await supabase.functions.invoke('record-profile-click', {
          body: { digger_profile_id: id }
        });
      } catch (error) {
        // Silently fail - click tracking shouldn't block page load
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
      const { data, error } = await supabase.functions.invoke("charge-profile-view", {
        body: { diggerId: digger.id },
      });

      if (error) {
        // Check if it's an access denied error
        if (error.status === 403 || error.message?.includes('must post') || error.message?.includes('not related')) {
          toast.error(error.message || "You can only view diggers related to your posted gigs.");
          if (error.message?.includes('must post')) {
            navigate("/post-gig");
          }
          return;
        }
        // Check if it's a subscription requirement error
        if (error.status === 402 || error.message?.includes('subscription')) {
          setDiggerNeedsSubscription(true);
          toast.error("This digger needs to activate their subscription first. Please contact them or try again later.");
          return;
        }
        throw error;
      }

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

      // Handle subscription requirement response
      if (data.requiresSubscription) {
        setDiggerNeedsSubscription(true);
        toast.error("This digger needs to activate their subscription before you can view their contact information.");
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
      // Error logging - consider using proper error tracking service in production
      if (import.meta.env.DEV) {
        console.error("Error unlocking contact:", error);
      }
      
      // Check if it's an access denied error
      if (error.status === 403 || error.message?.includes('must post') || error.message?.includes('not related')) {
        toast.error(error.message || "You can only view diggers related to your posted gigs.");
        if (error.message?.includes('must post')) {
          navigate("/post-gig");
        }
      } else if (error.status === 402 || error.message?.includes('subscription')) {
        setDiggerNeedsSubscription(true);
        toast.error("This digger needs to activate their subscription first.");
      } else {
        toast.error(error.message || "Failed to unlock contact information");
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
                  <div className="relative">
                    <Avatar className="h-24 w-24">
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
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold">
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
                      <Button variant="outline" onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}>
                        Add References
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No references provided yet.</p>
                  )}
                </div>
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

            {/* Conditional Content Based on Profile Ownership */}
            {isOwnProfile ? (
              /* Owner Dashboard */
              <div className="space-y-6">
                {/* Profile Actions Card - Prominent Edit/View buttons */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">Your Profile</h3>
                        <p className="text-sm text-muted-foreground">
                          {!digger.bio || !digger.profile_image_url ? 
                            'Complete your profile to attract more clients' : 
                            'Your profile is looking great!'}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline"
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                          View Profile
                        </Button>
                        <Button 
                          variant="secondary"
                          onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}
                        >
                          Save and Continue
                        </Button>
                        <Button onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </div>
                    </div>
                    
                    {/* Profile completion prompts */}
                    {(!digger.bio || !digger.profile_image_url || (references.length === 0)) && (
                      <div className="mt-4 pt-4 border-t border-primary/10">
                        <p className="text-sm font-medium mb-3">Complete your profile:</p>
                        <div className="flex flex-wrap gap-2">
                          {!digger.profile_image_url && (
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}>
                              <Camera className="h-3 w-3 mr-1" />
                              Add Photo
                            </Badge>
                          )}
                          {!digger.bio && (
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}>
                              <Sparkles className="h-3 w-3 mr-1" />
                              Add Bio
                            </Badge>
                          )}
                          {references.length === 0 && (
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}>
                              📋 Add References
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stats Summary - Clickable */}
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      📊 Profile Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div 
                        className="bg-primary/10 rounded-lg p-4 text-center cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => {
                          const el = document.getElementById('purchased-leads-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <div className="text-3xl font-bold text-primary">{totalLeadsSold}</div>
                        <div className="text-sm text-muted-foreground">Leads Purchased</div>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">
                          ${leadBalance?.balance?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-sm text-muted-foreground">Account Balance</div>
                      </div>
                      <div 
                        className="bg-yellow-500/10 rounded-lg p-4 text-center cursor-pointer hover:bg-yellow-500/20 transition-colors"
                        onClick={() => {
                          const el = document.getElementById('pending-purchases-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <div className="text-3xl font-bold text-yellow-600">
                          {leadPurchases.filter(p => p.status === 'pending').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Balance Card */}
                <Card className="bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Account Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-3xl font-bold text-primary">
                          ${leadBalance?.balance?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-sm text-muted-foreground">Available for lead purchases</p>
                      </div>
                      <Button onClick={() => navigate('/checkout')} variant="outline">
                        Add Funds
                      </Button>
                    </div>
                    {leadBalance && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <div className="text-lg font-semibold text-green-600">
                            ${leadBalance.total_deposited.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Deposited</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-red-600">
                            ${leadBalance.total_spent.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Spent</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Your Keywords Summary */}
                {(digger as any).keywords && Array.isArray((digger as any).keywords) && (digger as any).keywords.length > 0 && (
                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        🏷️ Your Keywords
                      </CardTitle>
                      <CardDescription>
                        Keywords that match you to relevant leads
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {((digger as any).keywords as string[]).map((keyword: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="px-3 py-1">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card className="bg-card border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      className="w-full"
                      size="lg"
                      onClick={() => navigate(`/keyword-summary?profileId=${id}`)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Manage Keywords & Buy Leads
                    </Button>
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={() => navigate(`/edit-digger-profile?profileId=${id}`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </CardContent>
                </Card>

                {/* Pending Purchases */}
                <div id="pending-purchases-section">
                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-500" />
                        Pending Purchases ({leadPurchases.filter(p => p.status === 'pending').length})
                      </CardTitle>
                      <CardDescription>
                        Complete these purchases or modify your selection
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {leadPurchases.filter(p => p.status === 'pending').length > 0 ? (
                        <div className="space-y-4">
                          {leadPurchases.filter(p => p.status === 'pending').map((purchase) => (
                            <div key={purchase.id} className="border rounded-lg p-4 bg-yellow-500/5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <h5 className="font-semibold truncate">
                                      {purchase.gig?.title || "Lead"}
                                    </h5>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                    {purchase.gig?.description || "No description"}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{purchase.exclusivity_type || "Standard"}</Badge>
                                    <span className="text-sm font-semibold">${purchase.amount_paid.toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button size="sm" onClick={() => navigate(`/checkout?leadId=${purchase.id}`)}>
                                    Complete
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => navigate(`/gig/${purchase.gig_id}`)}>
                                    View
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">No pending purchases</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Purchased Leads with Return Option */}
                <div id="purchased-leads-section">
                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Purchased Leads ({totalLeadsSold})
                      </CardTitle>
                      <CardDescription>
                        View your purchased leads and request credit for bad leads
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {leadPurchases.filter(p => p.status === 'completed').length > 0 ? (
                        <div className="space-y-4">
                          {leadPurchases.filter(p => p.status === 'completed').slice(0, 5).map((purchase) => {
                            const canReturn = purchase.exclusivity_type?.toLowerCase().includes('exclusive') || 
                                            purchase.exclusivity_type?.toLowerCase().includes('semi') ||
                                            purchase.gig?.is_confirmed_lead;
                            
                            return (
                              <div key={purchase.id} className="border rounded-lg p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      <h5 className="font-semibold truncate">
                                        {purchase.gig?.title || "Lead"}
                                      </h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                      {purchase.gig?.description || "No description"}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant={
                                        purchase.exclusivity_type?.toLowerCase().includes('24') ? 'default' :
                                        purchase.exclusivity_type?.toLowerCase().includes('semi') ? 'secondary' : 'outline'
                                      }>
                                        {purchase.exclusivity_type || "Standard"}
                                      </Badge>
                                      {purchase.gig?.is_confirmed_lead && (
                                        <Badge variant="default" className="bg-green-600">Confirmed</Badge>
                                      )}
                                      <span className="text-sm">${purchase.amount_paid.toFixed(2)}</span>
                                      <span className="text-sm text-muted-foreground">
                                        {new Date(purchase.purchased_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Button size="sm" variant="outline" onClick={() => navigate(`/gig/${purchase.gig_id}`)}>
                                      Details
                                    </Button>
                                    {canReturn && (
                                      <LeadReturnDialog
                                        leadPurchaseId={purchase.id}
                                        gigTitle={purchase.gig?.title || "Lead"}
                                        onSuccess={loadData}
                                        buttonClassName="text-xs"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {totalLeadsSold > 5 && (
                            <Button 
                              variant="link" 
                              className="w-full" 
                              onClick={() => navigate(`/my-leads?profileId=${id}`)}
                            >
                              View all {totalLeadsSold} leads →
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground">No leads purchased yet</p>
                          <Button 
                            variant="link" 
                            onClick={() => navigate(`/keyword-summary?profileId=${id}`)}
                          >
                            Browse leads to purchase
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Bad Lead Alert */}
                <Card className="bg-yellow-500/5 border-yellow-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">
                          Received a Bad Lead?
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          You can request credit within 24 hours for confirmed, semi-exclusive, or exclusive leads 
                          that don't match your service area or specialty. Click "Request Credit" on any eligible lead above.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Hiring Interface for Other Profiles */
              <>
                {/* Contact Info Unlock Section */}
                {!hasViewAccess && currentUser && (
              <Card className={`border-primary/50 ${diggerNeedsSubscription ? 'bg-yellow-500/5 border-yellow-500/50' : 'bg-primary/5'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {diggerNeedsSubscription ? '⏳ Subscription Required' : '🔒 Contact Information Locked'}
                  </CardTitle>
                  <CardDescription>
                    {diggerNeedsSubscription 
                      ? "This digger needs to activate their subscription before you can view their contact information."
                      : "Unlock this digger's full contact information to connect directly (free for subscribed diggers)"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {diggerNeedsSubscription ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          <strong>Note:</strong> This digger hasn't activated their subscription yet. Once they subscribe, 
                          you'll be able to view their contact information for free.
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Please check back later or contact the digger directly if you have their information.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-400">
                          <strong>Good news!</strong> This digger has an active subscription. 
                          Viewing their contact information is free.
                        </p>
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
                            🔓 View Contact Information
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Free for subscribed diggers - no payment required
                      </p>
                    </>
                  )}
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
              </>
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
              {!isOwnProfile && (
                <>
                  <Card>
                    <CardContent className="p-6 space-y-3">
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleSendMessage}
                      >
                        <MessageSquare className="mr-2 h-5 w-5" />
                        Send Message
                      </Button>
                      {digger.phone && hasViewAccess && (
                        <Button 
                          className="w-full" 
                          size="lg"
                          variant="secondary"
                          onClick={handleCallDigger}
                          disabled={isCallingDigger}
                        >
                          <Phone className="mr-2 h-5 w-5" />
                          {isCallingDigger ? 'Connecting...' : 'Call Digger'}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        Start a conversation to discuss your project with this digger
                      </p>
                    </CardContent>
                  </Card>

                  {/* Profile Pricing Info for Diggers */}
                  {digger.subscription_tier && digger.subscription_tier !== 'free' && (
                    <ProfileClickPricingCard
                      profession={digger.profession || 'contractor'}
                      showActions={false}
                      variant="full"
                    />
                  )}
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