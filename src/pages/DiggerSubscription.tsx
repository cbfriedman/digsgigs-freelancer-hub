import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PRICING_TIERS, INDUSTRY_PRICING } from "@/config/pricing";

const TIER_FEATURES = {
  free: [
    'Industry-specific lead pricing',
    `${PRICING_TIERS.free.escrowFee} escrow fee`,
    'Basic profile listing',
    'Standard support',
    'Access to all gig categories'
  ],
  pro: [
    'Lower industry-specific lead pricing',
    `${PRICING_TIERS.pro.escrowFee} escrow fee`,
    'Priority support',
    'Featured in search results',
    'Advanced analytics',
    'Access to all gig categories'
  ],
  premium: [
    'Lowest industry-specific lead pricing',
    `${PRICING_TIERS.premium.escrowFee} escrow fee`,
    'VIP support',
    'Top placement in search',
    'Advanced analytics',
    'Dedicated account manager',
    'Access to all gig categories'
  ]
};

export default function DiggerSubscription() {
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    checkSubscription();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profile?.user_type !== 'digger') {
      toast({
        title: "Access Denied",
        description: "This page is only for service professionals.",
        variant: "destructive"
      });
      navigate('/');
    }
  };

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setIsSubscribed(data.subscribed || false);
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
    if (!tier.priceId) return;
    
    setProcessing(tierId);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId: tier.priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive"
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
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDowngrade = async (tierId: 'free' | 'pro' | 'premium') => {
    setProcessing(tierId);
    try {
      if (tierId !== 'free') {
        toast({
          title: "Error",
          description: "Can only downgrade to free tier",
          variant: "destructive"
        });
        setProcessing(null);
        return;
      }

      const { error } = await supabase
        .from('digger_profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: null,
          subscription_end_date: null
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      toast({
        title: "Downgraded",
        description: "You've been downgraded to the Free tier.",
      });

      await checkSubscription();
    } catch (error: any) {
      console.error('Error downgrading:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to downgrade plan",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Choose Your Plan</h1>
            <p className="text-muted-foreground">
              Select the subscription that fits your business needs
            </p>
            {isSubscribed && subscriptionEnd && (
              <p className="text-sm text-muted-foreground mt-2">
                Current subscription renews on {new Date(subscriptionEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {(['free', 'pro', 'premium'] as const).map((tierId) => {
              const tier = PRICING_TIERS[tierId];
              return (
                <Card 
                  key={tier.id} 
                  className={`relative ${
                    currentTier === tierId && isSubscribed 
                      ? 'border-primary shadow-lg' 
                      : tier.popular 
                      ? 'border-accent' 
                      : ''
                  }`}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  {currentTier === tierId && isSubscribed && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      <Crown className="h-3 w-3 mr-1" />
                      Your Plan
                    </Badge>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">
                        {tier.price}
                      </span>
                      {tier.priceValue > 0 && <span className="text-muted-foreground">/month</span>}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {TIER_FEATURES[tierId].map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      onClick={() => tier.priceValue === 0 ? handleDowngrade(tierId) : handleSubscribe(tierId)}
                      disabled={(currentTier === tierId && isSubscribed) || processing !== null}
                      className="w-full"
                      variant={currentTier === tierId && isSubscribed ? "outline" : "default"}
                    >
                      {processing === tierId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (currentTier === tierId && isSubscribed) ? 'Current Plan' :
                        tier.priceValue === 0 ? 'Downgrade' : 'Subscribe'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {isSubscribed && (
            <div className="text-center">
              <Button
                onClick={handleManageSubscription}
                disabled={processing !== null}
                variant="outline"
              >
                {processing === 'manage' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
