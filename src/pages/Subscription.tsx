import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GeographicTierSelector } from "@/components/GeographicTierSelector";
import { 
  Crown, 
  Shield, 
  Clock, 
  Check, 
  ArrowRight,
  Loader2,
  Lock,
  AlertTriangle,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import {
  GeographicTier,
  IndustryType,
  BillingCycle,
  getSubscriptionTier,
  analyzeProfileIndustryTypes,
  formatSubscriptionPrice,
  PRICE_LOCK_PERIOD_MONTHS,
  PRICE_LOCK_CLICK_THRESHOLD,
} from "@/config/subscriptionTiers";

export default function Subscription() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const profileIdFromUrl = searchParams.get('profileId');
  const isUpgrade = searchParams.get('upgrade') === 'true';
  
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [diggerProfile, setDiggerProfile] = useState<any>(null);
  
  // Subscription selection state
  const [selectedTier, setSelectedTier] = useState<GeographicTier>('local');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [industryType, setIndustryType] = useState<IndustryType>('lv_mv');
  
  // Mixed industry type warning
  const [hasMixedTypes, setHasMixedTypes] = useState(false);
  const [hvProfessions, setHvProfessions] = useState<string[]>([]);
  const [lvMvProfessions, setLvMvProfessions] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/subscription');
      return;
    }
    loadDiggerProfile();
  }, [user, profileIdFromUrl]);

  const loadDiggerProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('digger_profiles')
        .select('*')
        .eq('user_id', user.id);
      
      if (profileIdFromUrl) {
        query = query.eq('id', profileIdFromUrl);
      }
      
      const { data: profiles, error } = await query;

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        setDiggerProfile(profile);
        
        // Fetch all professions for this profile
        const { data: professions } = await supabase
          .from('digger_professions')
          .select('profession_name')
          .eq('digger_profile_id', profile.id);
        
        // Collect all profession names (from digger_professions table + main profession field)
        const allProfessions: string[] = [];
        if (profile.profession) {
          allProfessions.push(profile.profession);
        }
        if (professions) {
          professions.forEach((p) => {
            if (!allProfessions.includes(p.profession_name)) {
              allProfessions.push(p.profession_name);
            }
          });
        }
        
        // Analyze industry types for all professions
        const analysis = analyzeProfileIndustryTypes(allProfessions);
        setIndustryType(analysis.industryType);
        setHasMixedTypes(analysis.hasMixedTypes);
        setHvProfessions(analysis.hvProfessions);
        setLvMvProfessions(analysis.lvMvProfessions);
        
        // Pre-select existing tier if upgrading
        if (profile.geographic_tier) {
          setSelectedTier(profile.geographic_tier as GeographicTier);
        }
        if (profile.billing_cycle) {
          setBillingCycle(profile.billing_cycle as BillingCycle);
        }
      } else {
        // No digger profile, redirect to registration
        toast.error('Please create a digger profile first');
        navigate('/digger-registration');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!diggerProfile || !session) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      setSubscribing(true);
      
      const { data, error } = await supabase.functions.invoke('create-geo-subscription-checkout', {
        body: {
          digger_profile_id: diggerProfile.id,
          geographic_tier: selectedTier,
          industry_type: industryType,
          billing_cycle: billingCycle,
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Failed to start checkout');
    } finally {
      setSubscribing(false);
    }
  };

  const selectedTierData = getSubscriptionTier(selectedTier, industryType);
  const selectedPrice = selectedTierData
    ? (billingCycle === 'monthly' 
        ? selectedTierData.monthly_price_cents 
        : selectedTierData.annual_price_cents)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Choose Your Subscription | DigsAndGigs</title>
        <meta name="description" content="Select your geographic coverage area and start receiving leads from consumers in your service area." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-4">
                <Crown className="h-3 w-3 mr-1" />
                {isUpgrade ? 'Upgrade Your Subscription' : 'Choose Your Plan'}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {isUpgrade ? 'Expand Your Reach' : 'Start Receiving Leads'}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Select your service coverage area. Your subscription activates when a consumer first views your profile.
              </p>
            </div>

            {/* Mixed Industry Types Warning */}
            {hasMixedTypes && (
              <Alert variant="default" className="mb-8 border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-700 dark:text-amber-400">Mixed Industry Types Detected</AlertTitle>
                <AlertDescription className="text-amber-600 dark:text-amber-300">
                  <p className="mb-2">
                    This profile contains both <strong>high-value</strong> ({hvProfessions.join(', ')}) and{' '}
                    <strong>standard</strong> ({lvMvProfessions.join(', ')}) professions.
                  </p>
                  <p className="mb-3">
                    To optimize your costs, consider creating <strong>separate profiles</strong> for each industry type.
                    Standard industry professions qualify for lower subscription rates.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/digger-registration?newProfile=true')}
                      className="border-amber-500 text-amber-700 hover:bg-amber-500/20"
                    >
                      Create Additional Profile
                    </Button>
                  </div>
                  <p className="text-xs mt-3 opacity-75">
                    Continuing with this profile will apply <strong>high-value pricing</strong> due to the HV profession(s).
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Profile Info */}
            {diggerProfile && (
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    {diggerProfile.profile_image_url ? (
                      <img 
                        src={diggerProfile.profile_image_url} 
                        alt={diggerProfile.business_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                          {diggerProfile.business_name?.[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{diggerProfile.business_name}</h3>
                      <p className="text-muted-foreground">{diggerProfile.profession}</p>
                      <Badge variant="secondary" className="mt-1">
                        {industryType === 'hv' ? 'High-Value Industry' : 'Standard Industry'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>
                        Subscription pricing is <strong>per profile</strong>. Each profile has its own subscription based on its professions and geographic coverage.
                      </p>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>
                        Need <strong>different geographic coverage</strong> for different services? Create separate profiles — each can have its own coverage area and rate.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Geographic Coverage Note */}
            <Alert variant="default" className="mb-8 border-primary/30 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertTitle>Geographic Coverage Applies to All Professions</AlertTitle>
              <AlertDescription>
                The geographic tier you select will apply to <strong>all professions</strong> on this profile.
                If you need different coverage areas for different services (e.g., local for plumbing, statewide for consulting), 
                consider creating separate profiles to optimize your subscription costs.
              </AlertDescription>
            </Alert>

            {/* Tier Selector */}
            <div className="mb-8">
              <GeographicTierSelector
                selectedTier={selectedTier}
                industryType={industryType}
                billingCycle={billingCycle}
                onTierChange={setSelectedTier}
                onBillingCycleChange={setBillingCycle}
                disabled={subscribing}
              />
            </div>

            {/* Benefits */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  What's Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Unlimited Lead Access</p>
                      <p className="text-sm text-muted-foreground">
                        Receive all matching leads in your coverage area
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{PRICE_LOCK_PERIOD_MONTHS}-Month Price Lock</p>
                      <p className="text-sm text-muted-foreground">
                        Your rate is guaranteed for 12 months from signup
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Extended Price Protection</p>
                      <p className="text-sm text-muted-foreground">
                        Keep your locked rate with &lt;{PRICE_LOCK_CLICK_THRESHOLD} monthly profile views
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Cancel Anytime</p>
                      <p className="text-sm text-muted-foreground">
                        No long-term contracts or cancellation fees
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscribe Button */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleSubscribe}
                disabled={subscribing || !selectedTierData}
                className="gap-2 px-8"
              >
                {subscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Subscribe for {formatSubscriptionPrice(selectedPrice)}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Secure payment powered by Stripe. You will be charged when your first lead views your profile.
              </p>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
