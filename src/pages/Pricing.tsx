import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";

const TIERS = {
  free: {
    name: 'Free',
    price: '$0',
    priceValue: 0,
    leadCost: '$3',
    leadCostValue: 3,
    priceId: null,
    popular: false,
    features: [
      'Unlimited bidding on gigs',
      '$3 per lead purchase',
      'Set daily/weekly/monthly lead limits',
      'Basic profile features',
      'Standard support',
      'Access to all gig categories'
    ]
  },
  pro: {
    name: 'Pro',
    price: '$10',
    priceValue: 10,
    leadCost: '$2',
    leadCostValue: 2,
    priceId: 'price_1STAlCRuFpm7XGfu6g6mrnRV',
    productId: 'prod_TQ0mK76zTAwoQc',
    popular: true,
    features: [
      'Unlimited bidding on gigs',
      '$2 per lead purchase',
      'Set daily/weekly/monthly lead limits',
      'Priority support',
      'Featured in search results',
      'Enhanced profile visibility',
      'Advanced analytics'
    ]
  },
  premium: {
    name: 'Premium',
    price: '$150',
    priceValue: 150,
    leadCost: '$0',
    leadCostValue: 0,
    priceId: 'price_1STAn5RuFpm7XGfuMrGHEspf',
    productId: 'prod_TQ0oKMEtoOhHO7',
    popular: false,
    features: [
      'Unlimited bidding on gigs',
      'FREE lead purchases',
      'Unlimited lead access',
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
            digsandgiggs
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
              Lower your commission by upgrading your plan. The more you subscribe, the more you keep from every completed gig.
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
                  <CardDescription className="text-lg font-semibold mt-2">
                    {tier.leadCost} per lead
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

          {/* Lead Cost Calculator */}
          <div className="mt-16 max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-center">Compare Lead Costs</CardTitle>
                <CardDescription className="text-center">
                  See how much you pay per lead on each tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {Object.entries(TIERS).map(([key, tier]) => {
                    const monthlyFee = tier.priceValue;
                    const leadCost = tier.leadCostValue;
                    
                    // Calculate break-even for 10 leads
                    const leadsPerMonth = 10;
                    const totalLeadCost = leadCost * leadsPerMonth;
                    const totalCost = monthlyFee + totalLeadCost;
                    
                    return (
                      <div key={key} className="text-center space-y-2">
                        <h4 className="font-semibold text-lg">{tier.name}</h4>
                        <div className="text-sm text-muted-foreground">
                          Monthly Fee: {tier.price}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Per Lead: {tier.leadCost}
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          10 Leads: ${totalCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          total monthly cost
                        </div>
                      </div>
                    );
                  })}
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
