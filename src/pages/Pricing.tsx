import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Star, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import PricingCalculator from "@/components/PricingCalculator";
import PlanRecommender from "@/components/PlanRecommender";
import PricingCharts from "@/components/PricingCharts";
import BreakevenCalculator from "@/components/BreakevenCalculator";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";

const TIERS = {
  free: {
    name: 'Free',
    price: '$0',
    priceValue: 0,
    leadCost: '$45',
    leadCostValue: 45,
    commission: '9%',
    commissionValue: 9,
    freeEstimateCost: '$100',
    hourlyRateCharge: '3 hours',
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
    leadCost: '$30',
    leadCostValue: 30,
    commission: '6%',
    commissionValue: 6,
    freeEstimateCost: '$75',
    hourlyRateCharge: '2 hours',
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
    leadCost: '$15',
    leadCostValue: 15,
    commission: '0%',
    commissionValue: 0,
    freeEstimateCost: '$50',
    hourlyRateCharge: '1 hour',
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
  const [interactiveLeads, setInteractiveLeads] = useState(30);
  const [interactiveJobValue, setInteractiveJobValue] = useState(1000);
  const [conversionRate, setConversionRate] = useState(15);
  const [showResults, setShowResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentTier = subscriptionStatus?.subscription_tier || 'free';

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
    const calculatedJobs = Math.round(interactiveLeads * (conversionRate / 100));
    const tiers = ['free', 'pro', 'premium'] as const;
    return tiers.map(tierKey => {
      const tier = TIERS[tierKey];
      const leadCosts = interactiveLeads * tier.leadCostValue;
      const totalCost = tier.priceValue + leadCosts;
      
      return {
        name: tier.name,
        monthly: tier.priceValue,
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
                className={`relative ${
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
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <span className="text-sm font-medium">Lead Cost:</span>
                      <span className="font-bold text-primary">{tier.leadCost}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <span className="text-sm font-medium">Free Estimate Upcharge:</span>
                      <span className="font-bold text-primary">{tier.freeEstimateCost}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <span className="text-sm font-medium">Hourly Award Upcharge:</span>
                      <span className="font-bold text-primary">{tier.hourlyRateCharge}</span>
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
                    onClick={() => handleSubscribe(key, tier.priceId)}
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

      {/* Interactive Commission Calculator */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Leads Purchase Calculator</CardTitle>
                <CardDescription className="text-center">
                  Calculate your costs based on your activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Interactive Controls */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-background/50 rounded-lg">
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
                    <Label>Conversion Rate</Label>
                    <Select 
                      value={conversionRate.toString()} 
                      onValueChange={(v) => setConversionRate(Number(v))}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {[5, 10, 15, 20, 25].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label># of Jobs (Auto-calculated)</Label>
                    <div className="h-10 px-3 py-2 bg-muted rounded-md border border-input flex items-center text-lg font-semibold">
                      {Math.round(interactiveLeads * (conversionRate / 100))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Average Revenues per job</Label>
                    <Select 
                      value={interactiveJobValue.toString()} 
                      onValueChange={(v) => setInteractiveJobValue(Number(v))}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {[500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 10000].map(num => (
                          <SelectItem key={num} value={num.toString()}>${num.toLocaleString()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                            const calculatedJobs = Math.round(interactiveLeads * (conversionRate / 100));
                            const totalRevenue = calculatedJobs * interactiveJobValue;
                            return (
                              <td key={result.name} className="text-right py-4 px-4 font-bold text-lg text-green-600">
                                ${totalRevenue.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">Monthly Subscription Fee</td>
                          {calculateInteractiveCosts().map((result) => (
                            <td key={result.name} className="text-right py-3 px-4">
                              ${result.monthly}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-3 px-4 text-muted-foreground">Upfront Lead Cost</td>
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
                          <td className="py-3 px-4 text-muted-foreground">Total Lead Costs</td>
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
                          <td className="py-3 px-4 text-muted-foreground">Jobs Awarded</td>
                          {Object.entries(TIERS).map(([key]) => (
                            <td key={key} className="text-right py-3 px-4">
                              {Math.round(interactiveLeads * (conversionRate / 100))}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b-2 border-border bg-red-50 dark:bg-red-950/20">
                          <td className="py-4 px-4 font-bold text-lg text-red-700 dark:text-red-400">
                            Total Costs
                          </td>
                          {calculateInteractiveCosts().map((result) => (
                            <td key={result.name} className="text-right py-4 px-4 font-bold text-lg text-red-600">
                              ${result.total.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b-2 border-border bg-blue-50 dark:bg-blue-950/20">
                          <td className="py-4 px-4 font-bold text-xl text-blue-700 dark:text-blue-400">
                            Net Earnings
                          </td>
                          {calculateInteractiveCosts().map((result) => {
                            const calculatedJobs = Math.round(interactiveLeads * (conversionRate / 100));
                            const totalRevenue = calculatedJobs * interactiveJobValue;
                            const netEarnings = totalRevenue - result.total;
                            return (
                              <td key={result.name} className="text-right py-4 px-4 font-bold text-xl text-blue-600">
                                ${netEarnings.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Components */}
      <div className="container mx-auto px-4 space-y-16 py-16">
        <PricingCalculator />
        <PlanRecommender />
        <PricingCharts />
        <BreakevenCalculator />
      </div>

      <Footer />
    </div>
  );
}
