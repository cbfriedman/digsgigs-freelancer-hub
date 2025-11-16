import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    price: '$50',
    priceValue: 50,
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
  const [interactiveLeads, setInteractiveLeads] = useState(15);
  const [interactiveJobs, setInteractiveJobs] = useState(2);
  const [interactiveJobValue, setInteractiveJobValue] = useState(1000);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (profile?.user_type === 'digger') {
          setIsDigger(true);
          
          const { data: diggerProfile } = await supabase
            .from('digger_profiles')
            .select('subscription_tier')
            .eq('user_id', user.id)
            .single();

          if (diggerProfile?.subscription_tier) {
            setCurrentTier(diggerProfile.subscription_tier);
          }
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
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

  const calculateInteractiveCosts = () => {
    const tiers = ['free', 'pro', 'premium'] as const;
    return tiers.map(tierKey => {
      const tier = TIERS[tierKey];
      const leadCosts = interactiveLeads * tier.leadCostValue;
      const commissions = interactiveJobs * (tier.commissionValue / 100) * interactiveJobValue;
      const commissionWithMin = Math.max(commissions, interactiveJobs * tier.minimumFee);
      const totalCost = tier.priceValue + leadCosts + commissionWithMin;
      
      return {
        name: tier.name,
        monthly: tier.priceValue,
        leadCosts,
        commissions: commissionWithMin,
        total: totalCost
      };
    });
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
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <span className="text-sm font-medium">Lead Cost:</span>
                      <span className="font-bold text-primary">{tier.leadCost}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                      <span className="text-sm font-medium">Commission:</span>
                      <span className="font-bold text-primary">{tier.commission}</span>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(key, tier.priceId)}
                    disabled={isButtonDisabled(key, tier.priceId)}
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
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
                <CardTitle className="text-center text-2xl">Commissions Only</CardTitle>
                <CardDescription className="text-center">
                  Calculate your costs based on your activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Interactive Controls */}
                <div className="grid md:grid-cols-3 gap-6 p-6 bg-background/50 rounded-lg">
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
                        {[5, 10, 15, 20, 25, 30, 40, 50].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label># of Jobs</Label>
                    <Select 
                      value={interactiveJobs.toString()} 
                      onValueChange={(v) => setInteractiveJobs(Number(v))}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Average Job Value</Label>
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
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-left p-3 font-semibold">Plan</th>
                        <th className="text-right p-3 font-semibold">Monthly Fee</th>
                        <th className="text-right p-3 font-semibold">Lead Costs</th>
                        <th className="text-right p-3 font-semibold">Commissions</th>
                        <th className="text-right p-3 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateInteractiveCosts().map((result, idx) => (
                        <tr key={result.name} className={`border-b border-border ${idx === 1 ? 'bg-primary/5' : ''}`}>
                          <td className="p-3 font-medium">{result.name}</td>
                          <td className="text-right p-3">${result.monthly}</td>
                          <td className="text-right p-3">${result.leadCosts.toFixed(2)}</td>
                          <td className="text-right p-3">${result.commissions.toFixed(2)}</td>
                          <td className="text-right p-3 font-bold text-primary">${result.total.toFixed(2)}</td>
                        </tr>
                      ))}
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
