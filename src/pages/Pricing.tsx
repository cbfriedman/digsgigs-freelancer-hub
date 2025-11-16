import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import PricingCalculator from "@/components/PricingCalculator";
import PlanRecommender from "@/components/PlanRecommender";
import PricingCharts from "@/components/PricingCharts";
import BreakevenCalculator from "@/components/BreakevenCalculator";

const TIERS = {
  free: {
    name: 'Free',
    price: '$0',
    priceValue: 0,
    leadCost: '$3',
    leadCostValue: 3,
    commission: '9% ($5 min)',
    commissionValue: 9,
    minimumFee: 5,
    priceId: null,
    popular: false,
    features: [
      'Unlimited bidding on gigs',
      '$3 per lead purchase',
      '9% commission on completed work',
      '$5 minimum fee per transaction',
      '$100 per free estimate request',
      '$100 per hourly rate click',
      '1 hour rate fee if awarded (min $100)',
      'Basic profile features',
      'Standard support',
      'Access to all gig categories'
    ]
  },
  pro: {
    name: 'Pro',
    price: '$100',
    priceValue: 100,
    leadCost: '$1.50',
    leadCostValue: 1.5,
    commission: '6% ($5 min)',
    commissionValue: 6,
    minimumFee: 5,
    priceId: 'price_1STAlCRuFpm7XGfu6g6mrnRV',
    productId: 'prod_TQ0mK76zTAwoQc',
    popular: true,
    features: [
      'Unlimited bidding on gigs',
      '$1.50 per lead purchase',
      '6% commission on completed work',
      '$5 minimum fee per transaction',
      '$100 per free estimate request',
      '$100 per hourly rate click',
      '1 hour rate fee if awarded (min $100)',
      'Priority support',
      'Featured in search results',
      'Enhanced profile visibility',
      'Advanced analytics'
    ]
  },
  premium: {
    name: 'Premium',
    price: '$600',
    priceValue: 600,
    leadCost: '$0',
    leadCostValue: 0,
    commission: '0%',
    commissionValue: 0,
    minimumFee: 0,
    priceId: 'price_1STAn5RuFpm7XGfuMrGHEspf',
    productId: 'prod_TQ0oKMEtoOhHO7',
    popular: false,
    features: [
      'Unlimited bidding on gigs',
      'FREE lead purchases',
      '0% commission on completed work',
      'No transaction fees',
      '$0 charge for Free Estimate requests',
      'FREE hourly rate clicks',
      '1 hour rate fee if awarded (min $100)',
      'Priority support',
      'Featured profile placement',
      'Advanced analytics',
      'Dedicated account manager',
      'Early access to new features'
    ]
  }
};

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [user, setUser] = useState<any>(null);
  const [isDigger, setIsDigger] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Check if user is a digger
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        
        const userIsDigger = profile?.user_type === 'digger';
        setIsDigger(userIsDigger);

        if (userIsDigger) {
          // Check subscription status
          const { data, error } = await supabase.functions.invoke('check-subscription');
          if (!error && data) {
            setCurrentTier(data.tier || 'free');
          }
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string, tierName: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in as a digger to subscribe.",
        variant: "destructive",
      });
      navigate('/auth?type=digger');
      return;
    }

    if (!isDigger) {
      toast({
        title: "Digger account required",
        description: "Only diggers can subscribe to these plans.",
        variant: "destructive",
      });
      return;
    }

    setSubscribing(tierName);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Subscription error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setSubscribing(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    }
  };

  const getButtonText = (tier: string, priceId: string | null) => {
    if (!user || !isDigger) return 'Sign Up as Digger';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            digsandgigs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Digger Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Choose Your Commission Rate
            </h1>
            <p className="text-xl text-muted-foreground">
              Lower your commission and get unlimited free estimate requests by upgrading to Pro. Keep more of your earnings on every gig.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              💰 <strong>Pro members save thousands per year</strong> on estimate requests - see the savings table below
            </p>
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
                  <CardDescription className="space-y-1 mt-2">
                    <div className="text-lg font-semibold">{tier.leadCost} per lead</div>
                    <div className="text-sm text-muted-foreground">{tier.commission} on completed work</div>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {key === 'pro' && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-600/20">
                      <div className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <strong className="text-green-600">Huge Savings:</strong>
                          <p className="text-muted-foreground mt-1">
                            Save $1.50/lead vs Free. At 20 leads/month = $360/year saved!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {key === 'premium' && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-600/20">
                      <div className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <strong className="text-green-600">Maximum Savings:</strong>
                          <p className="text-muted-foreground mt-1">
                            FREE leads + 0% commission. At 50 leads/month = $1,800/year saved vs Free!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                    onClick={() => {
                      if (tier.priceId) {
                        handleSubscribe(tier.priceId, key);
                      } else if (user && isDigger) {
                        // Already on free plan
                      } else {
                        navigate('/auth?type=digger');
                      }
                    }}
                    disabled={isButtonDisabled(key, tier.priceId)}
                  >
                    {getButtonText(key, tier.priceId)}
                  </Button>

                  {currentTier === key && key !== 'free' && (
                    <Button
                      className="w-full"
                      variant="ghost"
                      onClick={handleManageSubscription}
                    >
                      Manage Subscription
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comprehensive Cost Breakdown */}
          <div className="mt-16 max-w-6xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Complete Cost Breakdown by Usage Level</CardTitle>
                <CardDescription className="text-center">
                  Compare total monthly costs across different business activity levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {[
                  { 
                    label: 'Light Usage - Commission Based Plan', 
                    leads: 30, 
                    jobs: 3, 
                    jobValue: 1500, 
                    estimates: 3,
                    description: 'Part-time or starting out'
                  },
                  { 
                    label: 'Moderate Usage', 
                    leads: 15, 
                    jobs: 2, 
                    jobValue: 1000, 
                    estimates: 10,
                    description: 'Active professional'
                  },
                  { 
                    label: 'High Volume', 
                    leads: 30, 
                    jobs: 4, 
                    jobValue: 2000, 
                    estimates: 20,
                    description: 'Busy contractor'
                  },
                ].map((scenario, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-border"></div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold">{scenario.label}</h3>
                        <p className="text-xs text-muted-foreground">{scenario.description}</p>
                      </div>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground text-center mb-4">
                      {scenario.leads} leads • {scenario.jobs} jobs (${scenario.jobValue.toLocaleString()} each) • {scenario.estimates} estimate requests/month
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-border">
                            <th className="text-left py-3 px-4 font-semibold">Cost Component</th>
                            {Object.entries(TIERS).map(([key, tier]) => (
                              <th key={key} className="text-right py-3 px-4 font-semibold">{tier.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Monthly Subscription */}
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 text-muted-foreground">Monthly Subscription</td>
                            {Object.entries(TIERS).map(([key, tier]) => (
                              <td key={key} className="text-right py-3 px-4">
                                ${tier.priceValue.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                          
                          {/* Lead Purchases */}
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 text-muted-foreground">
                              Lead Purchases ({scenario.leads} × rate)
                            </td>
                            {Object.entries(TIERS).map(([key, tier]) => {
                              const leadCost = tier.leadCostValue * scenario.leads;
                              return (
                                <td key={key} className="text-right py-3 px-4">
                                  ${leadCost.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                          
                          {/* Commission on Jobs */}
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 text-muted-foreground">
                              Commission ({scenario.jobs} jobs at ${scenario.jobValue.toLocaleString()} each)
                            </td>
                            {Object.entries(TIERS).map(([key, tier]) => {
                              const totalJobValue = scenario.jobValue * scenario.jobs;
                              const commission = Math.max(
                                (totalJobValue * tier.commissionValue) / 100, 
                                tier.minimumFee * scenario.jobs
                              );
                              return (
                                <td key={key} className="text-right py-3 px-4">
                                  ${commission.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                          
                          {/* Estimate Requests */}
                          <tr className="border-b border-border/50 bg-muted/20">
                            <td className="py-3 px-4 text-muted-foreground font-medium">
                              Free Estimate Requests ({scenario.estimates} requests)
                            </td>
                            {Object.entries(TIERS).map(([key, tier]) => {
                              let estimateCost = 0;
                              if (key === 'free' || key === 'pro') {
                                estimateCost = scenario.estimates * 100;
                              }
                              return (
                                <td key={key} className="text-right py-3 px-4 font-medium">
                                  {estimateCost === 0 ? (
                                    <span className="text-green-600">FREE</span>
                                  ) : (
                                    `$${estimateCost.toFixed(2)}`
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                          
                          {/* Total Monthly Costs */}
                          <tr className="border-b-2 border-border bg-primary/5">
                            <td className="py-4 px-4 font-bold text-lg">Total Monthly Costs</td>
                            {Object.entries(TIERS).map(([key, tier]) => {
                              const leadCost = tier.leadCostValue * scenario.leads;
                              const totalJobValue = scenario.jobValue * scenario.jobs;
                              const commission = Math.max(
                                (totalJobValue * tier.commissionValue) / 100, 
                                tier.minimumFee * scenario.jobs
                              );
                              let estimateCost = 0;
                              if (key === 'free' || key === 'pro') {
                                estimateCost = scenario.estimates * 100;
                              }
                              const total = tier.priceValue + leadCost + commission + estimateCost;
                              return (
                                <td key={key} className="text-right py-4 px-4 font-bold text-lg text-primary">
                                  ${total.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                          
                          {/* Total Revenue */}
                          <tr className="border-b border-border/50">
                            <td className="py-3 px-4 text-muted-foreground">
                              Total Job Revenue ({scenario.jobs} jobs)
                            </td>
                            {Object.entries(TIERS).map(([key]) => {
                              const revenue = scenario.jobValue * scenario.jobs;
                              return (
                                <td key={key} className="text-right py-3 px-4">
                                  ${revenue.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                          
                          {/* Net Earnings */}
                          <tr className="bg-green-50 dark:bg-green-950/20">
                            <td className="py-4 px-4 font-bold text-lg text-green-700 dark:text-green-400">
                              Net Earnings (Revenue - Costs)
                            </td>
                            {Object.entries(TIERS).map(([key, tier]) => {
                              const revenue = scenario.jobValue * scenario.jobs;
                              const leadCost = tier.leadCostValue * scenario.leads;
                              const totalJobValue = scenario.jobValue * scenario.jobs;
                              const commission = Math.max(
                                (totalJobValue * tier.commissionValue) / 100, 
                                tier.minimumFee * scenario.jobs
                              );
                              let estimateCost = 0;
                              if (key === 'free' || key === 'pro') {
                                estimateCost = scenario.estimates * 100;
                              }
                              const totalCosts = tier.priceValue + leadCost + commission + estimateCost;
                              const netEarnings = revenue - totalCosts;
                              return (
                                <td key={key} className="text-right py-4 px-4 font-bold text-lg text-green-600">
                                  ${netEarnings.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Savings Comparison */}
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      {Object.entries(TIERS).slice(1).map(([key, tier]) => {
                        const freeTier = TIERS.free;
                        
                        // Calculate costs for both plans
                        const calculateTotal = (t: typeof tier) => {
                          const leadCost = t.leadCostValue * scenario.leads;
                          const totalJobValue = scenario.jobValue * scenario.jobs;
                          const commission = Math.max(
                            (totalJobValue * t.commissionValue) / 100, 
                            t.minimumFee * scenario.jobs
                          );
                          let estimateCost = 0;
                          if (key === 'free' || key === 'pro' || t === freeTier) {
                            estimateCost = scenario.estimates * 100;
                          }
                          return t.priceValue + leadCost + commission + estimateCost;
                        };
                        
                        const freeTotal = calculateTotal(freeTier);
                        const tierTotal = calculateTotal(tier);
                        const savings = freeTotal - tierTotal;
                        const annualSavings = savings * 12;
                        
                        return (
                          <div key={key} className="p-4 border rounded-lg bg-card">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">{tier.name} vs Free</span>
                              <Badge className={savings > 0 ? 'bg-green-600' : 'bg-red-600'}>
                                {savings > 0 ? 'Save' : 'Cost'} ${Math.abs(savings).toFixed(2)}/mo
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Annual {savings > 0 ? 'Savings' : 'Additional Cost'}: {' '}
                              <span className={`font-bold ${savings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${Math.abs(annualSavings).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex gap-3">
                    <div className="text-3xl">💡</div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-blue-900 dark:text-blue-100">Understanding Your Costs</h4>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• <strong>Monthly Subscription:</strong> Fixed fee charged monthly</li>
                        <li>• <strong>Lead Purchases:</strong> Pay only when you actively purchase a lead</li>
                        <li>• <strong>Commission:</strong> Charged only on completed, paid jobs</li>
                        <li>• <strong>Estimate Requests:</strong> Charged when consumers request your contact info</li>
                        <li>• <strong>Hourly Rate Clicks:</strong> Charged when consumers click to see your hourly rate</li>
                        <li>• <strong>Award Fee:</strong> When awarded hourly work, pay 1 hour of your rate (min $100) - applies to all plans</li>
                      </ul>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-3">
                        <strong>Higher tiers = More savings</strong> as your business grows. Premium tier eliminates all per-transaction costs!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Light Usage - Hourly Based Plan */}
          <div className="mt-16 max-w-6xl mx-auto">
            <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Light Usage - Hourly Based Plan</CardTitle>
                <CardDescription className="text-center">
                  Compare costs across different hourly rates (30 leads • 3 estimate requests/month)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[50, 100, 150, 200, 250, 500, 750, 1000].map((hourlyRate) => {
                  const leads = 30;
                  const estimates = 3;
                  const hourlyRateClicks = 3; // Assume all estimates result in hourly rate clicks
                  
                  return (
                    <div key={hourlyRate} className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-border"></div>
                        <div className="text-center">
                          <h3 className="text-lg font-bold">${hourlyRate}/Hour Rate</h3>
                          <p className="text-xs text-muted-foreground">
                            {leads} leads • {hourlyRateClicks} hourly clicks (awarded) • {estimates} estimate requests
                          </p>
                        </div>
                        <div className="flex-1 h-px bg-border"></div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-border">
                              <th className="text-left py-3 px-4 font-semibold">Cost Component</th>
                              {Object.entries(TIERS).map(([key, tier]) => (
                                <th key={key} className="text-right py-3 px-4 font-semibold">{tier.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Monthly Subscription */}
                            <tr className="border-b border-border/50">
                              <td className="py-3 px-4 text-muted-foreground">Monthly Subscription</td>
                              {Object.entries(TIERS).map(([key, tier]) => (
                                <td key={key} className="text-right py-3 px-4">
                                  ${tier.priceValue.toFixed(2)}
                                </td>
                              ))}
                            </tr>
                            
                            {/* Lead Purchases */}
                            <tr className="border-b border-border/50">
                              <td className="py-3 px-4 text-muted-foreground">
                                Lead Purchases ({leads} × rate)
                              </td>
                              {Object.entries(TIERS).map(([key, tier]) => {
                                const leadCost = tier.leadCostValue * leads;
                                return (
                                  <td key={key} className="text-right py-3 px-4">
                                    ${leadCost.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                            
                            {/* Estimate Requests */}
                            <tr className="border-b border-border/50 bg-muted/20">
                              <td className="py-3 px-4 text-muted-foreground font-medium">
                                Free Estimate Requests ({estimates} requests)
                              </td>
                              {Object.entries(TIERS).map(([key, tier]) => {
                                let estimateCost = 0;
                                if (key === 'free' || key === 'pro') {
                                  estimateCost = estimates * 100;
                                }
                                return (
                                  <td key={key} className="text-right py-3 px-4 font-medium">
                                    {estimateCost === 0 ? (
                                      <span className="text-green-600">FREE</span>
                                    ) : (
                                      `$${estimateCost.toFixed(2)}`
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Hourly Rate Click Costs */}
                            <tr className="border-b border-border/50 bg-muted/20">
                              <td className="py-3 px-4 text-muted-foreground font-medium">
                                Hourly Rate Click Costs ({hourlyRateClicks} clicks)
                              </td>
                              {Object.entries(TIERS).map(([key, tier]) => {
                                let hourlyClickCost = 0;
                                if (key === 'free' || key === 'pro') {
                                  hourlyClickCost = hourlyRateClicks * 100;
                                }
                                return (
                                  <td key={key} className="text-right py-3 px-4 font-medium">
                                    {hourlyClickCost === 0 ? (
                                      <span className="text-green-600">FREE</span>
                                    ) : (
                                      `$${hourlyClickCost.toFixed(2)}`
                                    )}
                                  </td>
                                );
                              })}
                            </tr>

                            {/* Award Fees */}
                            <tr className="border-b border-border/50 bg-amber-50 dark:bg-amber-950/20">
                              <td className="py-3 px-4 text-muted-foreground font-medium">
                                Award Fees ({hourlyRateClicks} × 1 hour rate, min $100)
                              </td>
                              {Object.entries(TIERS).map(([key]) => {
                                const awardFee = hourlyRateClicks * Math.max(hourlyRate, 100);
                                return (
                                  <td key={key} className="text-right py-3 px-4 font-medium">
                                    ${awardFee.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                            
                            {/* Total Monthly Costs */}
                            <tr className="border-t-2 border-border bg-muted/30">
                              <td className="py-4 px-4 font-bold">Total Monthly Costs</td>
                              {Object.entries(TIERS).map(([key, tier]) => {
                                const leadCost = tier.leadCostValue * leads;
                                let estimateCost = 0;
                                if (key === 'free' || key === 'pro') {
                                  estimateCost = estimates * 100;
                                }
                                let hourlyClickCost = 0;
                                if (key === 'free' || key === 'pro') {
                                  hourlyClickCost = hourlyRateClicks * 100;
                                }
                                const awardFee = hourlyRateClicks * Math.max(hourlyRate, 100);
                                const totalCosts = tier.priceValue + leadCost + estimateCost + hourlyClickCost + awardFee;
                                return (
                                  <td key={key} className="text-right py-4 px-4 font-bold text-lg">
                                    ${totalCosts.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Savings Comparison */}
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {Object.entries(TIERS).slice(1).map(([key, tier]) => {
                          const freeTier = TIERS.free;
                          
                          const calculateTotal = (t: typeof tier) => {
                            const leadCost = t.leadCostValue * leads;
                            let estimateCost = 0;
                            if (key === 'free' || key === 'pro') {
                              estimateCost = estimates * 100;
                            }
                            let hourlyClickCost = 0;
                            if (key === 'free' || key === 'pro') {
                              hourlyClickCost = hourlyRateClicks * 100;
                            }
                            const awardFee = hourlyRateClicks * Math.max(hourlyRate, 100);
                            return t.priceValue + leadCost + estimateCost + hourlyClickCost + awardFee;
                          };
                          
                          const freeCost = calculateTotal(freeTier);
                          const tierCost = calculateTotal(tier);
                          const monthlySavings = freeCost - tierCost;
                          const annualSavings = monthlySavings * 12;

                          return (
                            <Card key={key} className="bg-gradient-to-br from-primary/5 to-accent/5">
                              <CardContent className="pt-6">
                                <div className="text-center space-y-2">
                                  <p className="text-sm font-semibold text-primary">{tier.name} vs Free</p>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                      Monthly: <span className="font-semibold text-green-600">${monthlySavings.toFixed(2)}/mo</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Annual: <span className="font-semibold text-green-600">${annualSavings.toFixed(2)}/year</span>
                                    </p>
                                  </div>
                                  <Badge variant={monthlySavings > 0 ? "default" : "secondary"} className="text-xs">
                                    {monthlySavings > 0 ? `Save ${((monthlySavings / freeCost) * 100).toFixed(0)}%` : 'No savings'}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Info Banner */}
                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Understanding Hourly Rate Costs:</h4>
                  <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                    <ul className="space-y-2">
                      <li>• <strong>Hourly Rate Click:</strong> Charged when consumers click to view your hourly rate ($100 per click on Free & Pro, FREE on Premium)</li>
                      <li>• <strong>Award Fee:</strong> When awarded the hourly work, you pay 1 hour worth of your rate (minimum $100) - applies to ALL plans</li>
                      <li>• <strong>Total Cost:</strong> Click cost + Award fee + Other platform fees</li>
                    </ul>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-3 font-medium">
                      💡 <strong>Higher hourly rates = Higher award fees.</strong> Premium plan saves you the most on click costs!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Cost Calculator */}
          <div className="mt-16 max-w-6xl mx-auto">
            <PricingCalculator />
          </div>

          {/* Visual Charts */}
          <div className="mt-16 max-w-6xl mx-auto">
            <PricingCharts />
          </div>

          {/* Premium 10% Breakeven Calculator */}
          <div className="mt-16 max-w-6xl mx-auto">
            <BreakevenCalculator />
          </div>

          {/* Plan Recommender */}
          <div className="mt-16 max-w-6xl mx-auto">
            <PlanRecommender />
          </div>

          {/* Free Estimate Savings Comparison */}
          <div className="mt-16 max-w-5xl mx-auto">
            <Card className="border-green-600/20 bg-green-50/5">
              <CardHeader>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge className="bg-green-600 text-white">Pro Member Benefit</Badge>
                </div>
                <CardTitle className="text-center text-2xl">Free Estimate Request Savings</CardTitle>
                <CardDescription className="text-center">
                  See how much you save with unlimited free estimate requests on the Pro plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-4 px-4 font-semibold">Estimate Requests/Month</th>
                        <th className="text-right py-4 px-4 font-semibold">Free Tier Cost</th>
                        <th className="text-right py-4 px-4 font-semibold">Pro Cost</th>
                        <th className="text-right py-4 px-4 font-semibold text-green-600">Monthly Savings</th>
                        <th className="text-right py-4 px-4 font-semibold text-green-600">Annual Savings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { requests: 5, label: '5 (Light Usage)' },
                        { requests: 10, label: '10 (Average)' },
                        { requests: 15, label: '15 (Active)' },
                        { requests: 20, label: '20 (Very Active)' },
                        { requests: 30, label: '30 (Power User)' },
                        { requests: 50, label: '50 (High Volume)' },
                      ].map(({ requests, label }) => {
                        const freeCost = requests * 100;
                        const proCost = 50 + (requests * 100); // Pro is $50/month but still pays $100 per estimate
                        const premiumCost = 999; // Premium gets FREE estimates
                        const vsProSavings = freeCost - proCost;
                        const vsPremiumSavings = freeCost - premiumCost;
                        const proAnnualSavings = vsProSavings * 12;
                        const premiumAnnualSavings = vsPremiumSavings * 12;
                        
                        return (
                          <tr 
                            key={requests} 
                            className="border-b hover:bg-muted/30"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{label}</span>
                              </div>
                            </td>
                            <td className="text-right py-4 px-4 text-muted-foreground">
                              ${freeCost.toLocaleString()}/mo
                            </td>
                            <td className="text-right py-4 px-4">
                              ${proCost.toLocaleString()}/mo
                            </td>
                            <td className={`text-right py-4 px-4 font-semibold ${
                              vsProSavings > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {vsProSavings > 0 ? '+' : ''}${vsProSavings.toLocaleString()}/mo
                            </td>
                            <td className={`text-right py-4 px-4 font-bold ${
                              proAnnualSavings > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {proAnnualSavings > 0 ? '+' : ''}${proAnnualSavings.toLocaleString()}/yr
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50/50 rounded-lg border border-red-600/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">⚠️</span>
                      <h4 className="font-semibold text-red-600">Free Tier</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pay <strong>$100 per estimate request and hourly click</strong> + 1 hour rate fee when awarded (min $100). Costs add up quickly!
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50/50 rounded-lg border border-yellow-600/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💰</span>
                      <h4 className="font-semibold text-yellow-700">Pro Tier</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      $100 per estimate/hourly click + award fee when hired, but offset by lower lead and commission costs.
                    </p>
                  </div>

                  <div className="p-4 bg-green-50/50 rounded-lg border border-green-600/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-600">Premium Tier</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-green-600">FREE estimate requests and hourly clicks!</strong> Award fee applies when hired. Plus zero commissions and free leads.
                    </p>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Premium tier offers the best value for high-volume users with FREE estimate requests + zero commissions on all work
                  </p>
                  <Button 
                    size="lg"
                    onClick={() => {
                      if (user && isDigger) {
                        handleSubscribe(TIERS.premium.priceId, 'premium');
                      } else {
                        navigate('/auth?type=digger');
                      }
                    }}
                    disabled={currentTier === 'premium' || subscribing === 'premium'}
                    className="bg-gradient-to-r from-purple-600 to-primary hover:from-purple-700 hover:to-primary/90"
                  >
                    {currentTier === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How Free Estimates & Hourly Rate Clicks Work */}
          <div className="mt-16 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-2xl">How Free Estimate Requests & Hourly Rate Charges Work</CardTitle>
                <CardDescription className="text-center">
                  Understanding the cost of connecting with potential clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground">
                    When consumers interact with your profile, they show serious interest in hiring you. Here's how charges work:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-2">
                    <li><strong>Free Estimate Requests:</strong> When a consumer requests a free estimate, you receive their full contact information</li>
                    <li><strong>Hourly Rate Clicks:</strong> When a consumer clicks to view your hourly rate, you pay per click</li>
                    <li><strong>Hourly Rate Award Fee:</strong> If awarded work based on your hourly rate, you pay 1 hour worth of your hourly rate (minimum $100). This applies to all plans.</li>
                  </ul>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-6 border-2 border-red-200 rounded-lg bg-red-50/30">
                    <h3 className="text-lg font-semibold mb-3 text-red-700">Free Tier</h3>
                    <div className="text-3xl font-bold text-red-600 mb-2">$100</div>
                    <p className="text-sm text-muted-foreground mb-4">per estimate/hourly click</p>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>$100 per estimate request</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>$100 per hourly rate click</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>+ 1 hour rate if awarded (min $100)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 border-2 border-yellow-200 rounded-lg bg-yellow-50/30">
                    <h3 className="text-lg font-semibold mb-3 text-yellow-700">Pro Tier</h3>
                    <div className="text-3xl font-bold text-yellow-600 mb-2">$100</div>
                    <p className="text-sm text-muted-foreground mb-4">per estimate/hourly click</p>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>$100 per estimate request</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>$100 per hourly rate click</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>+ 1 hour rate if awarded (min $100)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>But save on leads & commission</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 border-2 border-green-200 rounded-lg bg-green-50/30 relative overflow-hidden">
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-600">Best Value</Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-3 text-green-700">Premium Tier</h3>
                    <div className="text-3xl font-bold text-green-600 mb-2">FREE</div>
                    <p className="text-sm text-muted-foreground mb-4">hourly rate clicks!</p>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                        <span><strong>FREE</strong> estimate requests</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                        <span><strong>FREE</strong> hourly rate clicks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>+ 1 hour rate if awarded (min $100)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                        <span>FREE leads + zero commission</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">Why these charges?</h4>
                      <p className="text-sm text-blue-800 space-y-2">
                        <span className="block">• <strong>Click fees</strong> connect you with serious buyers and filter casual browsers</span>
                        <span className="block">• <strong>Award fees</strong> (1 hour minimum) ensure fair compensation for platform value when work is secured</span>
                        <span className="block">• Premium members get FREE clicks but still pay award fees when winning hourly work</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex gap-3">
                    <div className="text-2xl">📊</div>
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-2">Award Fee Example</h4>
                      <p className="text-sm text-amber-800">
                        If your hourly rate is <strong>$75/hour</strong>, you'll pay <strong>$100</strong> when awarded (the minimum).<br/>
                        If your rate is <strong>$150/hour</strong>, you'll pay <strong>$150</strong> when awarded (1 hour of your rate).<br/>
                        This fee applies to <strong>all plans</strong> when you win work based on your hourly rate.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fee Transparency */}
          <div className="mt-16 max-w-4xl mx-auto">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-center">How Payments Work</CardTitle>
                <CardDescription className="text-center">
                  Clear, transparent pricing with no hidden fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
                      Diggers Pay Commission
                    </h3>
                    <p className="text-muted-foreground">
                      When you complete a gig, you pay our platform commission based on your subscription tier. That's it - no other fees for diggers.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>Free: 9% commission ($5 minimum)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>Pro: 4% commission ($5 minimum)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>Premium: 0% commission - keep everything</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <span className="bg-accent/10 text-accent rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
                      Giggers Pay Processing
                    </h3>
                    <p className="text-muted-foreground">
                      Clients (giggers) pay a standard ~3% payment processing fee when funding a gig. This covers credit card and payment gateway costs.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span>Added transparently at checkout</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span>Standard across all platforms</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span>Covers secure payment processing</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm text-center">
                    <strong>Example:</strong> On a $1,000 gig with Pro plan, the digger keeps $960 (after 4% commission), 
                    and the gigger pays ~$30 in processing fees when funding the project.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">When is commission charged?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Commission is only charged when you successfully complete a gig and receive payment. There are no upfront commission charges.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What if I don't win any gigs?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    On the Free plan, there's no cost to you. On paid plans, you pay the monthly subscription regardless of gigs won, but you benefit from lower commission rates when you do win work.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
