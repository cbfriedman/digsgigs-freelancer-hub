import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIERS = {
  free: {
    name: 'Free',
    price: '$0',
    commission: '9% ($5 min)',
    priceId: null,
    features: [
      'Unlimited bidding on gigs',
      '9% commission on completed work',
      '$5 minimum fee per transaction',
      'Basic profile features',
      'Standard support'
    ]
  },
  pro: {
    name: 'Pro',
    price: '$20',
    commission: '7% ($5 min)',
    priceId: 'price_1ST8X5RuFpm7XGfur2qH1ZpC',
    productId: 'prod_TPyUnTApWI764D',
    features: [
      'Unlimited bidding on gigs',
      '7% commission on completed work',
      '$5 minimum fee per transaction',
      'Priority support',
      'Featured in search results',
      'Enhanced profile visibility'
    ]
  },
  premium: {
    name: 'Premium',
    price: '$150',
    commission: '0%',
    priceId: 'price_1ST8XORuFpm7XGfu5bUQgd0B',
    productId: 'prod_TPyUCJBfmNqCrQ',
    features: [
      'Unlimited bidding on gigs',
      '0% commission - keep 100% of earnings',
      'No transaction fees',
      'Priority support',
      'Featured profile placement',
      'Advanced analytics',
      'Dedicated account manager'
    ]
  }
};

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    checkSubscriptionStatus();
    
    // Handle redirect from Stripe
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      toast({
        title: "Subscription activated!",
        description: "Your subscription has been successfully activated.",
      });
      // Remove query params
      navigate('/subscription', { replace: true });
    } else if (canceled === 'true') {
      toast({
        title: "Subscription canceled",
        description: "You can subscribe anytime.",
        variant: "destructive",
      });
      navigate('/subscription', { replace: true });
    }
  }, [searchParams]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
  };

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setCurrentTier(data.tier || 'free');
      setSubscriptionEnd(data.subscription_end);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string, tierName: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setSubscribing(tierName);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId }
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
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
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Error opening portal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Lower commissions, more earnings. Upgrade anytime.
          </p>
        </div>

        {currentTier !== 'free' && (
          <div className="max-w-2xl mx-auto mb-8">
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>
                  You're on the {TIERS[currentTier as keyof typeof TIERS].name} plan
                  {subscriptionEnd && ` until ${new Date(subscriptionEnd).toLocaleDateString()}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleManageSubscription} variant="outline">
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.entries(TIERS).map(([key, tier]) => {
            const isCurrentTier = currentTier === key;
            const isSubscribing = subscribing === key;
            
            return (
              <Card
                key={key}
                className={`relative ${isCurrentTier ? 'border-primary shadow-lg' : ''}`}
              >
                {isCurrentTier && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Your Plan
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.price !== '$0' && <span className="text-muted-foreground">/month</span>}
                  </div>
                  <CardDescription className="text-lg font-semibold text-foreground">
                    {tier.commission} commission
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {tier.priceId ? (
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(tier.priceId!, key)}
                      disabled={isCurrentTier || isSubscribing}
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentTier ? (
                        'Current Plan'
                      ) : (
                        `Upgrade to ${tier.name}`
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={isCurrentTier}
                    >
                      {isCurrentTier ? 'Current Plan' : 'Free Plan'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
