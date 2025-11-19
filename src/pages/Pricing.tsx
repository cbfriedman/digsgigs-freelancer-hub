import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Star, RefreshCw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PricingCalculator from "@/components/PricingCalculator";
import PlanRecommender from "@/components/PlanRecommender";
import PricingCharts from "@/components/PricingCharts";
import BreakevenCalculator from "@/components/BreakevenCalculator";
import PricingModelComparison from "@/components/PricingModelComparison";
import ProjectCostCalculator from "@/components/ProjectCostCalculator";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { generateFAQSchema } from "@/components/StructuredData";
import { HourlyUpchargeDisplay } from "@/components/HourlyUpchargeDisplay";
import { HourlyUpchargeCalculator } from "@/components/HourlyUpchargeCalculator";
import { TierSavingsCalculator } from "@/components/TierSavingsCalculator";

const TIERS = {
  free: {
    name: 'Free',
    price: '$0',
    priceValue: 0,
    costPerClick: '$125',
    costPerClickValue: 125,
    leadCost: '$20',
    leadCostValue: 20,
    commission: '9%',
    commissionValue: 9,
    escrowFee: '10%',
    escrowFeeValue: 10,
    freeEstimateCost: '$150',
    hourlyRateCharge: '3 hours',
    escrowProcessingFee: '9% per payment (min $10)',
    escrowProcessingFeeValue: 0.09,
    escrowProcessingMinimum: 10,
    minimumFee: 0,
    priceId: null,
    productId: null,
    popular: false,
    features: [],
  },
  pro: {
    name: 'Pro',
    price: '$99',
    priceValue: 99,
    costPerClick: '$100',
    costPerClickValue: 100,
    leadCost: '$10',
    leadCostValue: 10,
    commission: '6%',
    commissionValue: 6,
    escrowFee: '6%',
    escrowFeeValue: 6,
    freeEstimateCost: '$100',
    hourlyRateCharge: '2 hours',
    escrowProcessingFee: '8% per payment (min $10)',
    escrowProcessingFeeValue: 0.08,
    escrowProcessingMinimum: 10,
    minimumFee: 0,
    priceId: 'price_1STAlCRuFpm7XGfu6g6mrnRV',
    productId: 'prod_TQ0mK76zTAwoQc',
    popular: true,
    features: [],
  },
  premium: {
    name: 'Premium',
    price: '$599',
    priceValue: 599,
    costPerClick: '$75',
    costPerClickValue: 75,
    leadCost: '$5',
    leadCostValue: 5,
    commission: '0%',
    commissionValue: 0,
    escrowFee: '3%',
    escrowFeeValue: 3,
    freeEstimateCost: '$50',
    hourlyRateCharge: '1 hour',
    escrowProcessingFee: '4% per payment (min $10)',
    escrowProcessingFeeValue: 0.04,
    escrowProcessingMinimum: 10,
    minimumFee: 0,
    priceId: 'price_1STAlDRuFpm7XGfuoEnpBk4T',
    productId: 'prod_TQ0mVQT1H5f1zg',
    popular: false,
    features: [],
  },
};

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
    const tierName = TIERS[tier as keyof typeof TIERS].name;
    if (!user || !isDigger) return `Sign Up as Digger - ${tierName}`;
    if (currentTier === tier) return 'Current Plan';
    if (!priceId) return 'Current Plan';
    if (subscribing === tier) return <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>;
    return 'Subscribe';
  };

  const isButtonDisabled = (tier: string, priceId: string | null) => {
    if (subscribing) return true;
    if (user && isDigger && currentTier === tier) return true;
    return false;
  };

  const calculateInteractiveCosts = () => {
    const tiers = ['free', 'pro', 'premium'] as const;
    return tiers.map(tierKey => {
      const tier = TIERS[tierKey];
      const leadCosts = interactiveLeads * tier.leadCostValue;
      const freeEstimateCosts = calculatedClicks * (tier.freeEstimateCost ? parseFloat(tier.freeEstimateCost.replace('$', '')) : 0);
      const totalCost = tier.priceValue + leadCosts + freeEstimateCosts;
      
      return {
        name: tier.name,
        monthly: tier.priceValue,
        leadCosts,
        freeEstimateCosts,
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
              Choose your Plan
            </h1>
            <p className="text-xl text-muted-foreground">
              Select the plan that best fits your business needs. Upgrade to lower costs and maximize your earnings on every project.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              💰 <strong>Pro members save thousands per year</strong> on estimate requests - see the savings table below
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

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {Object.entries(TIERS).map(([key, tier]) => (
              <Card 
                key={key}
                onClick={() => !isButtonDisabled(key, tier.priceId) && handleSubscribe(key, tier.priceId)}
                className={`relative cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                  currentTier === key 
                    ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                    : tier.popular 
                    ? 'border-primary/50 shadow-md' 
                    : ''
                } ${isButtonDisabled(key, tier.priceId) ? 'opacity-75 cursor-not-allowed' : ''}`}
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
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Lead Cost:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">The cost for receiving the lead in your inbox. Gigger contact information is only revealed after awarding the project or accepting a Free Estimate request.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-primary">{tier.leadCost}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Cost Per Click:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">Flat fee charged when a Gigger clicks to view your contact information. This is in addition to the Lead Cost for your tier.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-primary">{tier.costPerClick}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Free Estimate Upcharge:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">Upfront cost when a consumer requests a free estimate from your profile, will be rebated against Awards of $5,000 or more. No rebates available for hourly rate awards</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-primary">{tier.freeEstimateCost}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Hourly Award Upcharge:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">Additional charge when you win an hourly project. Free Plan: 3 hours, Pro: 2 hours, Premium: 1 hour of your average hourly rate</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-primary">{tier.hourlyRateCharge}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Escrow Fees:</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">Fee charged on each milestone or progress payment released through escrow. Free: 9%, Pro: 8%, Premium: 4% of the payment amount with a minimum fee of $10 per release.</p>
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

      {/* Interactive Commission Calculator */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Fixed-Price Contracts Calculator</CardTitle>
                <CardDescription className="text-center">
                  Calculate your costs based on your activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Interactive Controls */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-background/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Leads Purchased</Label>
                    <Select 
                      value={interactiveLeads.toString()} 
                      onValueChange={(v) => setInteractiveLeads(Number(v))}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Leads to Clicks Conversion Rate</Label>
                    <Select 
                      value={leadsToClicksRate.toString()} 
                      onValueChange={(v) => setLeadsToClicksRate(Number(v))}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label># of Clicks (Auto-calculated)</Label>
                    <div className="h-10 px-3 py-2 bg-muted rounded-md border border-input flex items-center text-lg font-semibold">
                      {calculatedClicks}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Clicks to Award Conversion Rate</Label>
                    <Select 
                      value={clicksToAwardRate.toString()} 
                      onValueChange={(v) => setClicksToAwardRate(Number(v))}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label># of Awards (Auto-calculated)</Label>
                    <div className="h-10 px-3 py-2 bg-muted rounded-md border border-input flex items-center text-lg font-semibold">
                      {calculatedAwards}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="averageRevenue">Average Revenue per Job</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        id="averageRevenue"
                        type="number"
                        placeholder="Enter amount"
                        value={interactiveJobValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setInteractiveJobValue(value === "" ? "" : Number(value));
                        }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-7 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculate Button */}
                <div className="flex justify-center">
                  <Button 
                    onClick={() => setShowResults(true)}
                    size="lg"
                    className="px-8"
                  >
                    Calculate
                  </Button>
                </div>

                {/* Results Table */}
                {showResults && (
                  <TooltipProvider>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-border bg-muted/50">
                          <th className="text-left py-3 px-4 font-semibold">Estimated P&L</th>
                          {Object.entries(TIERS).map(([key, tier]) => (
                            <th key={key} className="text-right py-3 px-4 font-semibold">{tier.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b-2 border-border bg-green-50 dark:bg-green-950/20">
                          <td className="py-4 px-4 font-bold text-lg text-green-700 dark:text-green-400">
                            Total Estimated Revenues
                          </td>
                          {calculateInteractiveCosts().map((result) => {
                            const totalRevenue = calculatedAwards * jobValueNumber;
                            return (
                              <td key={result.name} className="text-right py-4 px-4 font-bold text-lg text-green-600">
                                ${totalRevenue.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              Monthly Subscription Fee
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>The fixed monthly cost for your subscription tier. This gives you access to leads and platform features.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {calculateInteractiveCosts().map((result) => (
                            <td key={result.name} className="text-right py-3 px-4">
                              ${result.monthly}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              Cost Per Click
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Flat fee charged when a Gigger clicks to view contact information, in addition to Lead Cost.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {Object.entries(TIERS).map(([key, tier]) => (
                            <td key={key} className="text-right py-3 px-4">
                              <span className="font-semibold">${tier.costPerClickValue.toFixed(2)}</span>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">Assumed number of Clicks</td>
                          {Object.entries(TIERS).map(([key]) => (
                            <td key={key} className="text-right py-3 px-4">
                              {calculatedClicks}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              Total Cost Per Clicks
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Total cost for all clicks (# of Clicks × Cost Per Click).</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {Object.entries(TIERS).map(([key, tier]) => {
                            const totalClickCost = calculatedClicks * tier.costPerClickValue;
                            return (
                              <td key={key} className="text-right py-3 px-4">
                                ${totalClickCost.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              Lead Cost
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>The cost per lead contact you purchase. This is a one-time fee for each lead you choose to pursue.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {Object.entries(TIERS).map(([key, tier]) => (
                            <td key={key} className="text-right py-3 px-4">
                              {tier.leadCostValue === 0 ? (
                                <span className="text-green-600 font-semibold">FREE</span>
                              ) : (
                                `$${tier.leadCostValue.toFixed(2)}`
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">Leads Purchased</td>
                          {Object.entries(TIERS).map(([key]) => (
                            <td key={key} className="text-right py-3 px-4">
                              {interactiveLeads}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              Total Lead Costs
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>The total amount spent on purchasing all leads (Lead Cost × Number of Leads).</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {calculateInteractiveCosts().map((result) => (
                            <td key={result.name} className="text-right py-3 px-4">
                              {result.leadCosts === 0 ? (
                                <span className="text-green-600 font-semibold">FREE</span>
                              ) : (
                                `$${result.leadCosts.toFixed(2)}`
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              Add for Free Estimates
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Cost of providing free estimates based on the number of clicks (Free Estimate Cost × Number of Clicks).</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {calculateInteractiveCosts().map((result) => (
                            <td key={result.name} className="text-right py-3 px-4">
                              ${result.freeEstimateCosts.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b-2 border-border bg-primary/5">
                          <td className="py-3 px-4 font-semibold">
                            <div className="flex items-center gap-2">
                              Est. Cost of Award (per contract)
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Average cost to win each contract based on your conversion rates (Total Click Cost + Total Lead Cost + Free Estimate Costs) / # of Awards.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {Object.entries(TIERS).map(([key, tier]) => {
                            const totalClickCost = calculatedClicks * tier.costPerClickValue;
                            const totalLeadCost = interactiveLeads * tier.leadCostValue;
                            const freeEstimateCost = calculatedClicks * (tier.freeEstimateCost ? parseFloat(tier.freeEstimateCost.replace('$', '')) : 0);
                            const costPerAward = calculatedAwards > 0 ? (totalClickCost + totalLeadCost + freeEstimateCost) / calculatedAwards : 0;
                            return (
                              <td key={key} className="text-right py-3 px-4 font-semibold text-lg text-primary">
                                ${costPerAward.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">Jobs Awarded</td>
                          {Object.entries(TIERS).map(([key]) => (
                            <td key={key} className="text-right py-3 px-4">
                              {calculatedAwards}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              Deduct for Free Estimate Rebate
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Rebate of the free estimate charge for contracts of $5,000 or more. Not applicable for hourly contracts.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {Object.entries(TIERS).map(([key, tier]) => {
                            const freeEstimateCost = tier.name === 'Free' ? 150 : tier.name === 'Pro' ? 100 : 50;
                            const rebate = jobValueNumber >= 5000 ? -(calculatedAwards * freeEstimateCost) : 0;
                            return (
                              <td key={key} className="text-right py-3 px-4">
                                {rebate === 0 ? '$0.00' : (
                                  <span className="text-green-600 font-semibold">
                                    ${rebate.toFixed(2)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b border-border/50 bg-red-50 dark:bg-red-950/20">
                          <td className="py-3 px-4 font-semibold text-red-700 dark:text-red-400">
                            <div className="flex items-center gap-2">
                              Total Cost Per Job
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Average total cost per awarded job (Total Costs / Jobs Awarded).</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {calculateInteractiveCosts().map((result) => {
                            const costPerJob = calculatedAwards > 0 ? result.total / calculatedAwards : 0;
                            return (
                              <td key={result.name} className="text-right py-3 px-4 font-semibold text-red-600">
                                ${costPerJob.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b-2 border-border bg-red-50 dark:bg-red-950/20">
                          <td className="py-4 px-4 font-bold text-lg text-red-700 dark:text-red-400">
                            <div className="flex items-center gap-2">
                              Total Costs
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>The sum of your monthly subscription fee and all lead costs before revenue and escrow fees.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {calculateInteractiveCosts().map((result) => (
                            <td key={result.name} className="text-right py-4 px-4 font-bold text-lg text-red-600">
                              ${result.total.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              Escrow Processing Fee
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Tier-based fee charged on milestone payments for fixed-price contracts with escrow. Free: 10%, Pro: 6%, Premium: 3%. The fee is deducted from each milestone payment before releasing funds.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {calculateInteractiveCosts().map((result) => {
                            const totalRevenue = calculatedAwards * jobValueNumber;
                            const tierData = TIERS[result.name.toLowerCase() as keyof typeof TIERS];
                            const escrowFee = totalRevenue * (tierData.escrowFeeValue / 100);
                            return (
                              <td key={result.name} className="text-right py-3 px-4">
                                ${escrowFee.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b border-border/50 bg-blue-50 dark:bg-blue-950/20">
                          <td className="py-3 px-4 font-semibold text-blue-700 dark:text-blue-400">
                            <div className="flex items-center gap-2">
                              Profit or (Loss) per Job
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Average profit or loss per awarded job after all costs and fees.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          {calculateInteractiveCosts().map((result) => {
                            const totalRevenue = calculatedAwards * jobValueNumber;
                            const tierData = TIERS[result.name.toLowerCase() as keyof typeof TIERS];
                            const escrowFee = totalRevenue * (tierData.escrowFeeValue / 100);
                            const totalProfit = totalRevenue - result.total - escrowFee;
                            const profitPerJob = calculatedAwards > 0 ? totalProfit / calculatedAwards : 0;
                            const isLoss = profitPerJob < 0;
                            return (
                              <td key={result.name} className={`text-right py-3 px-4 font-semibold ${isLoss ? 'text-red-600' : 'text-blue-600'}`}>
                                {isLoss ? `($${Math.abs(profitPerJob).toFixed(2)})` : `$${profitPerJob.toFixed(2)}`}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b-2 border-border bg-blue-50 dark:bg-blue-950/20">
                          <td className="py-4 px-4 font-bold text-xl text-blue-700 dark:text-blue-400">
                            Total Profit or (Loss)
                          </td>
                          {calculateInteractiveCosts().map((result) => {
                            const totalRevenue = calculatedAwards * jobValueNumber;
                            const tierData = TIERS[result.name.toLowerCase() as keyof typeof TIERS];
                            const escrowFee = totalRevenue * (tierData.escrowFeeValue / 100);
                            const totalProfit = totalRevenue - result.total - escrowFee;
                            const isLoss = totalProfit < 0;
                            return (
                              <td key={result.name} className={`text-right py-4 px-4 font-bold text-xl ${isLoss ? 'text-red-600' : 'text-blue-600'}`}>
                                {isLoss ? `($${Math.abs(totalProfit).toFixed(2)})` : `$${totalProfit.toFixed(2)}`}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>
            
            {/* CTA Section after Calculator */}
            {interactiveLeads > 0 && jobValueNumber > 0 && (
              <div className="mt-8">
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="py-8">
                    <div className="text-center space-y-4">
                      <h3 className="text-2xl font-bold">Ready to Choose Your Plan?</h3>
                      <p className="text-muted-foreground max-w-2xl mx-auto">
                        Based on your calculations, select the tier that maximizes your profit
                      </p>
                      <div className="flex flex-wrap justify-center gap-4 pt-4">
                        {Object.entries(TIERS).map(([key, tier]) => (
                          <Button
                            key={key}
                            onClick={() => handleSubscribe(key, tier.priceId)}
                            disabled={isButtonDisabled(key, tier.priceId)}
                            variant={tier.popular ? "default" : "outline"}
                            size="lg"
                            className="min-w-[140px]"
                          >
                            {getButtonText(key, tier.priceId)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Additional Components */}
      <PricingModelComparison />
      
      {/* CTA Section after Pricing Model Comparison */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary/5 to-accent/10 border-primary/20">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold">Compare Plans and Make Your Choice</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  See how different pricing models work and choose the plan that fits your business
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  {Object.entries(TIERS).map(([key, tier]) => (
                    <Button
                      key={key}
                      onClick={() => handleSubscribe(key, tier.priceId)}
                      disabled={isButtonDisabled(key, tier.priceId)}
                      variant={tier.popular ? "default" : "outline"}
                      size="lg"
                      className="min-w-[140px]"
                    >
                      {tier.name} - {tier.price}/mo
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <ProjectCostCalculator />
      
      <div className="container mx-auto px-4 py-16 space-y-16">
        <HourlyUpchargeCalculator />
        <TierSavingsCalculator />
        
        {/* CTA Section after Calculators */}
        <Card className="bg-gradient-to-r from-accent/10 to-primary/5 border-primary/20">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold">Start Saving on Your Leads Today</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Upgrade to a higher tier and reduce your per-lead costs immediately
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                {Object.entries(TIERS).map(([key, tier]) => (
                  <Button
                    key={key}
                    onClick={() => handleSubscribe(key, tier.priceId)}
                    disabled={isButtonDisabled(key, tier.priceId)}
                    variant={currentTier === key ? "secondary" : tier.popular ? "default" : "outline"}
                    size="lg"
                    className="min-w-[140px]"
                  >
                    {currentTier === key ? '✓ Current Plan' : `Choose ${tier.name}`}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="container mx-auto px-4 space-y-16 py-16">
        <PricingCalculator />
        <PlanRecommender />
        <PricingCharts />
        <BreakevenCalculator />
        
        {/* Final CTA Section */}
        <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border-primary/30">
          <CardContent className="py-12">
            <div className="text-center space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-lg px-4 py-2">
                Ready to Get Started?
              </Badge>
              <h2 className="text-3xl font-bold">Choose Your Plan Now</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands of professionals growing their business with digsandgigs
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-6">
                {Object.entries(TIERS).map(([key, tier]) => (
                  <Button
                    key={key}
                    onClick={() => handleSubscribe(key, tier.priceId)}
                    disabled={isButtonDisabled(key, tier.priceId)}
                    variant={tier.popular ? "default" : "outline"}
                    size="lg"
                    className="min-w-[160px] text-lg py-6"
                  >
                    {currentTier === key ? (
                      <span className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Current Plan
                      </span>
                    ) : (
                      `${tier.name} - ${tier.price}/mo`
                    )}
                  </Button>
                ))}
              </div>
              {!user && (
                <p className="text-sm text-muted-foreground mt-4">
                  New to digsandgigs? Sign up as a Digger to get started
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
