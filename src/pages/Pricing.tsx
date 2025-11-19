import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndustryMultiSelector } from "@/components/IndustryMultiSelector";
import { Check, Loader2, Star, RefreshCw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PlanRecommender from "@/components/PlanRecommender";
import PricingCharts from "@/components/PricingCharts";
import BreakevenCalculator from "@/components/BreakevenCalculator";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { generateFAQSchema } from "@/components/StructuredData";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
import EscrowFeeBreakdown from "@/components/EscrowFeeBreakdown";
import LeadNumberingExplainer from "@/components/LeadNumberingExplainer";
import LeadCostTimeline from "@/components/LeadCostTimeline";
import InteractiveLeadSlider from "@/components/InteractiveLeadSlider";
import MonthlyLeadSimulator from "@/components/MonthlyLeadSimulator";
import CompetitorCostComparison from "@/components/CompetitorCostComparison";

import { PRICING_TIERS, INDUSTRY_PRICING, getLeadCostForIndustry, getAllIndustries } from "@/config/pricing";

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isDigger, subscriptionStatus, loading: authLoading, checkSubscription } = useAuth();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [interactiveLeads, setInteractiveLeads] = useState(50);
  const [interactiveJobValue, setInteractiveJobValue] = useState<number | string>(5000);
  const [leadsToClicksRate, setLeadsToClicksRate] = useState(25);
  const [clicksToAwardRate, setClicksToAwardRate] = useState(25);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  // Define getLeadCostForTier early so it can be used in TIERS
  const getLeadCostForTier = (tier: 'free' | 'pro' | 'premium') => {
    if (selectedIndustries.length === 0) {
      // Default to least expensive (low-value category minimum)
      return INDUSTRY_PRICING[0][tier]; // Low-value services
    }
    // Return highest cost from selected industries
    return Math.max(...selectedIndustries.map(ind => getLeadCostForIndustry(ind, tier)));
  };

  const TIERS = {
    free: {
      name: PRICING_TIERS.free.name,
      price: PRICING_TIERS.free.price,
      priceValue: PRICING_TIERS.free.priceValue,
      leadCostRange: `$${INDUSTRY_PRICING[0].free}-$${INDUSTRY_PRICING[2].free}`,
      leadCostValue: getLeadCostForTier('free'),
      escrowFee: PRICING_TIERS.free.escrowFee,
      escrowFeeValue: PRICING_TIERS.free.escrowFeeValue,
      escrowProcessingFee: PRICING_TIERS.free.escrowProcessingFee,
      escrowProcessingFeeValue: PRICING_TIERS.free.escrowProcessingFeeValue,
      escrowProcessingMinimum: PRICING_TIERS.free.escrowProcessingMinimum,
      priceId: PRICING_TIERS.free.priceId,
      productId: PRICING_TIERS.free.productId,
      popular: PRICING_TIERS.free.popular,
      volumeTier: 'Free Tier (1-10 leads/mo)',
      description: 'Full Retail price',
      savingsPercent: 0,
      features: [],
    },
    pro: {
      name: PRICING_TIERS.pro.name,
      price: PRICING_TIERS.pro.price,
      priceValue: PRICING_TIERS.pro.priceValue,
      leadCostRange: `$${INDUSTRY_PRICING[0].pro}-$${INDUSTRY_PRICING[2].pro}`,
      leadCostValue: getLeadCostForTier('pro'),
      escrowFee: PRICING_TIERS.pro.escrowFee,
      escrowFeeValue: PRICING_TIERS.pro.escrowFeeValue,
      escrowProcessingFee: PRICING_TIERS.pro.escrowProcessingFee,
      escrowProcessingFeeValue: PRICING_TIERS.pro.escrowProcessingFeeValue,
      escrowProcessingMinimum: PRICING_TIERS.pro.escrowProcessingMinimum,
      priceId: PRICING_TIERS.pro.priceId,
      productId: PRICING_TIERS.pro.productId,
      popular: PRICING_TIERS.pro.popular,
      volumeTier: 'Pro Tier (11-50 leads/mo)',
      description: 'Best Bulk Pricing - Lock in 17% savings',
      savingsPercent: 17,
      features: [],
    },
    premium: {
      name: PRICING_TIERS.premium.name,
      price: PRICING_TIERS.premium.price,
      priceValue: PRICING_TIERS.premium.priceValue,
      leadCostRange: `$${INDUSTRY_PRICING[0].premium}-$${INDUSTRY_PRICING[2].premium}`,
      leadCostValue: getLeadCostForTier('premium'),
      escrowFee: PRICING_TIERS.premium.escrowFee,
      escrowFeeValue: PRICING_TIERS.premium.escrowFeeValue,
      escrowProcessingFee: PRICING_TIERS.premium.escrowProcessingFee,
      escrowProcessingFeeValue: PRICING_TIERS.premium.escrowProcessingFeeValue,
      escrowProcessingMinimum: PRICING_TIERS.premium.escrowProcessingMinimum,
      priceId: PRICING_TIERS.premium.priceId,
      productId: PRICING_TIERS.premium.productId,
      popular: PRICING_TIERS.premium.popular,
      volumeTier: 'Premium Tier (51+ leads/mo)',
      description: 'Best Bulk Pricing - Lock in 33% savings',
      savingsPercent: 33,
      features: [],
    },
  };
  
  // Calculate clicks and awards
  const calculatedClicks = Math.round(interactiveLeads * (leadsToClicksRate / 100));
  const calculatedAwards = Math.round(calculatedClicks * (clicksToAwardRate / 100));
  
  // Convert interactiveJobValue to number for calculations
  const jobValueNumber = typeof interactiveJobValue === 'string' ? (interactiveJobValue === '' ? 0 : Number(interactiveJobValue)) : interactiveJobValue;
  
  const [refreshing, setRefreshing] = useState(false);
  const [hourlyRateMin, setHourlyRateMin] = useState<number | null>(null);
  const [hourlyRateMax, setHourlyRateMax] = useState<number | null>(null);

  const currentTier = subscriptionStatus?.subscription_tier || 'free';

  useEffect(() => {
    if (user && isDigger) {
      loadDiggerProfile();
    }
  }, [user, isDigger]);

  const loadDiggerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('digger_profiles')
        .select('hourly_rate_min, hourly_rate_max')
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setHourlyRateMin(data.hourly_rate_min);
        setHourlyRateMax(data.hourly_rate_max);
      }
    } catch (error) {
      console.error('Error loading digger profile:', error);
    }
  };

  const handleRefreshSubscription = async () => {
    setRefreshing(true);
    await checkSubscription();
    setRefreshing(false);
    toast({
      title: "Subscription Updated",
      description: "Your subscription status has been refreshed.",
    });
  };

  const handleSubscribe = async (tier: string, priceId: string | null) => {
    if (!user) {
      navigate('/auth', { state: { redirectTo: '/pricing' } });
      return;
    }

    if (!isDigger) {
      navigate('/digger-registration');
      return;
    }

    if (!priceId) {
      toast({
        title: "Already on Free Plan",
        description: "You're currently on the free plan.",
      });
      return;
    }

    setSubscribing(tier);

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      });
      setSubscribing(null);
    }
  };

  const getButtonText = (tier: string, priceId: string | null) => {
    if (selectedIndustries.length === 0) return 'Select Industry First';
    const tierName = TIERS[tier as keyof typeof TIERS].name;
    if (!user || !isDigger) return `Sign Up as Digger - ${tierName}`;
    if (currentTier === tier) return 'Current Plan';
    if (!priceId) return 'Current Plan';
    if (subscribing === tier) return <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>;
    return 'Subscribe';
  };

  const isButtonDisabled = (tier: string, priceId: string | null) => {
    if (selectedIndustries.length === 0) return true;
    if (subscribing) return true;
    if (user && isDigger && currentTier === tier) return true;
    return false;
  };

  const calculateInteractiveCosts = () => {
    const tiers = ['free', 'pro', 'premium'] as const;
    return tiers.map(tierKey => {
      const leadCost = getLeadCostForTier(tierKey);
      const leadCosts = interactiveLeads * leadCost;
      const totalCost = PRICING_TIERS[tierKey].priceValue + leadCosts;
      
      return {
        name: PRICING_TIERS[tierKey].name,
        monthly: PRICING_TIERS[tierKey].priceValue,
        leadCosts,
        total: totalCost
      };
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing Plans - Transparent Subscription & Lead Costs"
        description="Compare pricing plans for service professionals on digsandgigs. Choose from Free, Pro, or Premium tiers with transparent lead costs, no hidden fees, and flexible monthly subscriptions. Calculate your ROI with our interactive pricing calculator."
        keywords="pricing plans, lead costs, subscription tiers, service professional pricing, contractor leads, freelance pricing, transparent pricing"
        structuredData={generateFAQSchema([
          { question: "What are the subscription tiers?", answer: "We offer Free ($0/month), Pro ($99/month), and Premium ($599/month) tiers with different lead costs and features." },
          { question: "How much do leads cost?", answer: "Lead costs vary by tier: Free tier leads cost $60, Pro tier leads cost $40, and Premium tier leads are FREE." },
          { question: "Is there a commission on completed jobs?", answer: "Commission rates depend on your tier: Free (9%), Pro (6%), Premium (0%)." }
        ])}
      />
      {/* Navigation */}
      <Navigation showBackButton backLabel="Back to Home" />

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Digger Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Choose your Monthly Commitment
            </h1>
            <p className="text-xl text-muted-foreground">
              Select your expected lead volume at the start of each month and lock in your rate. Pay only for leads you actually receive at your committed tier pricing.
            </p>
            
            {/* Subscription Status and Refresh */}
            {isDigger && subscriptionStatus && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Badge variant={subscriptionStatus.subscription_status === 'active' ? 'default' : 'secondary'}>
                  Current: {subscriptionStatus.subscription_tier.charAt(0).toUpperCase() + subscriptionStatus.subscription_tier.slice(1)} Plan
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshSubscription}
                  disabled={refreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Industry Selector */}
      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Label htmlFor="industry-select" className="text-base font-medium mb-3 block text-center">
              Select your Industries to determine your lead cost
            </Label>
            <div className="flex items-center gap-4 justify-center">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-2xl font-bold text-primary whitespace-nowrap">1st Step</span>
                <span className="text-5xl text-primary animate-[pulse_1s_ease-in-out_infinite]">→</span>
              </div>
              <div className="flex-1 max-w-md">
                <IndustryMultiSelector 
                  selectedIndustries={selectedIndustries}
                  onIndustriesChange={setSelectedIndustries}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {Object.entries(TIERS).map(([key, tier]) => (
              <Card 
                key={key}
                onClick={() => !isButtonDisabled(key, tier.priceId) && handleSubscribe(key, tier.priceId)}
                className={`relative transition-all ${
                  selectedIndustries.length === 0
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-xl hover:scale-105'
                } ${
                  currentTier === key 
                    ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                    : tier.popular 
                    ? 'border-primary/50 shadow-md' 
                    : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {currentTier === key && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="bg-green-500 text-white">
                      Active
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold mt-4">
                    {tier.volumeTier}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-2">
                    Expected: {key === 'free' ? '1-10 leads per month' : key === 'pro' ? '11-50 leads per month' : '51+ leads per month'}
                  </p>
                  {tier.savingsPercent !== undefined && (
                    <div className="mt-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={tier.savingsPercent === 0 ? "bg-muted text-muted-foreground text-sm px-3 py-1 cursor-help" : "bg-green-500 text-white text-sm px-3 py-1 cursor-help"}>
                              {tier.savingsPercent === 0 ? "Standard Rate" : `Save ${tier.savingsPercent}%`}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              {tier.savingsPercent === 0 
                                ? "This is the standard Free tier rate with no volume commitment. Higher volume commitments unlock lower per-lead costs." 
                                : `By committing to ${key === 'pro' ? '11-50' : '51+'} leads per month, you save ${tier.savingsPercent}% compared to the standard Free tier rate.`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  {tier.description && (
                    <CardDescription className="mt-3 text-sm font-medium text-primary">
                      {tier.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Industry Selection Required Notice */}
                  {selectedIndustries.length === 0 && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 rounded-lg text-center">
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                        ⬆️ Select an industry above to unlock pricing
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Lead Cost (highest selected):</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">
                                {tier.volumeTier === 'Free Tier (1-10 leads/mo)' 
                                  ? 'Standard pricing - Commit to receiving 1-10 leads per month. All leads charged at this rate.'
                                  : tier.volumeTier === 'Pro Tier (11-50 leads/mo)'
                                  ? 'Best Bulk Pricing - Commit to 11-50 leads/month. Lock in 17% savings on every lead.'
                                  : 'Best Bulk Pricing - Commit to 51+ leads/month. Lock in 33% savings on every lead.'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-primary">${tier.leadCostValue}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg border border-dashed border-muted-foreground/30">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Escrow Fees:</span>
                            <Badge variant="outline" className="text-xs px-2 py-0">Optional</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">Only if gig poster requests escrow</span>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">Fee charged only when gig posters request escrow protection for their project. Charged on each milestone or progress payment released through escrow, with a minimum fee of $10 per release.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-primary">{tier.escrowProcessingFee}</span>
                    </div>
                  </div>

                  {tier.features.length > 0 && (
                    <ul className="space-y-3">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubscribe(key, tier.priceId);
                    }}
                    disabled={isButtonDisabled(key, tier.priceId)}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {getButtonText(key, tier.priceId)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How Commitment-Based Pricing Works */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-base font-semibold mb-4 text-center">🔒 How Commitment-Based Pricing Works:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• <strong>Choose your profession</strong></li>
                <li>• <strong>Choose Your Tier:</strong> At the start of each month, select the tier that matches your expected lead volume</li>
                <li>• <strong>Lock In Your Rate:</strong> All leads you receive that month will be charged at your chosen tier's rate</li>
                <li>• <strong>Pay As You Go:</strong> You only pay for leads you actually receive - no upfront costs or monthly fees</li>
                <li>• <strong>Standard: 1-10 leads/month:</strong> Standard pricing - Perfect for getting started or low volume</li>
                <li>• <strong>Pro: 11-50 leads/month:</strong> Bulk Pricing - Save 17% when you expect 11+ leads</li>
                <li>• <strong>Premium: 51+ leads/month:</strong> Best Bulk Pricing - Save 33% with maximum volume commitment</li>
                <li>• <strong>Credit roll over</strong> to the following month(s) if not enough leads.</li>
                <li>• <strong>Refund credits</strong> after deducting the Standard Price of Sold leads</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-4 italic text-center">
                Choose wisely! Your commitment level determines your per-lead cost for the entire month, regardless of how many leads you actually receive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hourly Upcharge Display for Logged-in Diggers */}
      {isDigger && user && (hourlyRateMin || hourlyRateMax) && (
        <section className="py-8 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-4 text-center">Your Hourly Award Upcharge</h3>
              <HourlyUpchargeDisplay
                hourlyRateMin={hourlyRateMin}
                hourlyRateMax={hourlyRateMax}
                subscriptionTier={currentTier}
              />
            </div>
          </div>
        </section>
      )}


      <div className="container mx-auto px-4 space-y-16 py-16">
        <InteractiveLeadSlider />
        <MonthlyLeadSimulator />
        <CompetitorCostComparison />
        <LeadCostTimeline />
        <LeadNumberingExplainer />
        <EscrowFeeBreakdown />
        <PlanRecommender />
        <PricingCharts />
        <BreakevenCalculator />
      </div>

      <Footer />
    </div>
  );
}
