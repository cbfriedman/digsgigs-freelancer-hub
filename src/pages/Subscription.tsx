import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PRICING_TIERS } from "@/config/pricing";

const TIER_FEATURES = {
  free: [
    'Unlimited bidding on gigs',
    `${PRICING_TIERS.free.leadCost} per lead purchase`,
    `${PRICING_TIERS.free.escrowProcessingFee}`,
    `${PRICING_TIERS.free.hourlyRateCharge} rate charge when awarded (hourly)`,
    'Access to all gig categories',
    'Full profile features',
    'Profile visibility',
    'AI support',
    'Advanced analytics',
  ],
  pro: [
    'Unlimited bidding on gigs',
    `${PRICING_TIERS.pro.leadCost} per lead purchase`,
    `${PRICING_TIERS.pro.escrowProcessingFee}`,
    `${PRICING_TIERS.pro.hourlyRateCharge} rate charge when awarded (hourly)`,
    'Access to all gig categories',
    'Full profile features',
    'Profile visibility',
    'AI support',
    'Advanced analytics',
  ],
  premium: [
    'Unlimited bidding on gigs',
    `${PRICING_TIERS.premium.leadCost} per lead purchase`,
    `${PRICING_TIERS.premium.escrowProcessingFee}`,
    `${PRICING_TIERS.premium.hourlyRateCharge} rate charge when awarded (hourly)`,
    'Access to all gig categories',
    'Full profile features',
    'Profile visibility',
    'AI support',
    'Advanced analytics',
  ]
};

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
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

  const handleSubscribe = async (tierId: 'free' | 'pro' | 'premium') => {
    const tier = PRICING_TIERS[tierId];
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (tierId === 'free') {
      toast({
        title: "Free tier",
        description: "You're already on the free tier.",
      });
      return;
    }

    setProcessing(tierId);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: tier.priceId }
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
      setProcessing(null);
    }
  };

  const handleManageSubscription = async () => {
    setProcessing('manage');
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
    } finally {
      setProcessing(null);
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
                  You're on the {PRICING_TIERS[currentTier as 'free' | 'pro' | 'premium'].name} plan
                  {subscriptionEnd && ` until ${new Date(subscriptionEnd).toLocaleDateString()}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleManageSubscription} variant="outline" disabled={processing === 'manage'}>
                  {processing === 'manage' ? 'Loading...' : 'Manage Subscription'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {(['free', 'pro', 'premium'] as const).map((tierId) => {
            const tier = PRICING_TIERS[tierId];
            const isCurrentTier = currentTier === tierId;
            
            return (
              <Card key={tierId} className={`relative ${isCurrentTier ? 'border-primary shadow-lg' : ''}`}>
                {isCurrentTier && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Your Plan</Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.priceValue > 0 && <span className="text-muted-foreground">/month</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {TIER_FEATURES[tierId].map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" onClick={() => handleSubscribe(tierId)} disabled={isCurrentTier || processing === tierId}>
                    {processing === tierId ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : isCurrentTier ? 'Current Plan' : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
