import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Crown, 
  MapPin, 
  Map, 
  Globe, 
  Lock, 
  Unlock, 
  TrendingUp,
  Calendar,
  MousePointerClick,
  Settings,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatSubscriptionPrice, GEOGRAPHIC_TIER_LABELS, PRICE_LOCK_PERIOD_MONTHS, PRICE_LOCK_CLICK_THRESHOLD } from "@/config/subscriptionTiers";

interface SubscriptionStatusCardProps {
  diggerProfileId: string;
}

interface SubscriptionData {
  subscribed: boolean;
  subscription_status: string;
  geographic_tier: string | null;
  industry_type: string | null;
  billing_cycle: string | null;
  subscription_tier: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  price_locked: boolean;
  price_lock_days_remaining: number;
  original_price_cents: number | null;
  current_price_cents: number | null;
  current_month_clicks: number;
}

const tierIcons: Record<string, React.ReactNode> = {
  local: <MapPin className="h-5 w-5" />,
  statewide: <Map className="h-5 w-5" />,
  nationwide: <Globe className="h-5 w-5" />,
};

export function SubscriptionStatusCard({ diggerProfileId }: SubscriptionStatusCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, [diggerProfileId]);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-geo-subscription', {
        body: { digger_profile_id: diggerProfileId }
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setSubscriptionData(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setManagingSubscription(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setManagingSubscription(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not subscribed state
  if (!subscriptionData?.subscribed) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-muted-foreground" />
            No Active Subscription
          </CardTitle>
          <CardDescription>
            Subscribe to start receiving leads from consumers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            When a consumer clicks your profile, your subscription will be activated. Choose your geographic coverage area to set your pricing.
          </p>
          <Button onClick={() => navigate(`/subscription?profileId=${diggerProfileId}`)}>
            View Subscription Options
          </Button>
        </CardContent>
      </Card>
    );
  }

  const geoTier = subscriptionData.geographic_tier || 'local';
  const priceLockProgress = subscriptionData.price_lock_days_remaining > 0
    ? (subscriptionData.price_lock_days_remaining / (PRICE_LOCK_PERIOD_MONTHS * 30)) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              {tierIcons[geoTier] || <Crown className="h-5 w-5" />}
            </div>
            {GEOGRAPHIC_TIER_LABELS[geoTier as keyof typeof GEOGRAPHIC_TIER_LABELS] || geoTier} Subscription
          </CardTitle>
          <Badge variant={subscriptionData.subscription_status === 'active' ? 'default' : 'secondary'}>
            {subscriptionData.subscription_status}
          </Badge>
        </div>
        <CardDescription>
          {subscriptionData.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing
          {subscriptionData.industry_type === 'hv' && ' • High-value industry'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Price */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Your Rate</p>
            <p className="text-2xl font-bold">
              {subscriptionData.original_price_cents
                ? formatSubscriptionPrice(subscriptionData.original_price_cents)
                : '--'}
              <span className="text-sm font-normal text-muted-foreground">
                /{subscriptionData.billing_cycle === 'annual' ? 'yr' : 'mo'}
              </span>
            </p>
          </div>
          
          {/* Price Lock Status */}
          <div className="flex items-center gap-2">
            {subscriptionData.price_locked ? (
              <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                <Lock className="h-3 w-3" />
                Price Locked
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Unlock className="h-3 w-3" />
                Current Rate
              </Badge>
            )}
          </div>
        </div>

        {/* Price Lock Countdown */}
        {subscriptionData.price_locked && subscriptionData.price_lock_days_remaining > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Price Lock Guarantee
              </span>
              <span className="font-medium">
                {subscriptionData.price_lock_days_remaining} days remaining
              </span>
            </div>
            <Progress value={priceLockProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Your rate is guaranteed for 12 months from sign-up. After that, it stays locked as long as you receive less than {PRICE_LOCK_CLICK_THRESHOLD} clicks per month.
            </p>
          </div>
        )}

        {/* Click Counter */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">This Month's Profile Views</span>
          </div>
          <Badge variant={subscriptionData.current_month_clicks >= PRICE_LOCK_CLICK_THRESHOLD ? "default" : "secondary"}>
            {subscriptionData.current_month_clicks} clicks
          </Badge>
        </div>

        {/* Price Change Warning */}
        {!subscriptionData.price_locked && 
         subscriptionData.original_price_cents !== subscriptionData.current_price_cents && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-700">Price Updated</p>
              <p className="text-yellow-600">
                Current market rate is {formatSubscriptionPrice(subscriptionData.current_price_cents || 0)}/
                {subscriptionData.billing_cycle === 'annual' ? 'yr' : 'mo'}. 
                Your subscription will update to this rate on your next billing cycle.
              </p>
            </div>
          </div>
        )}

        {/* Subscription Dates */}
        {subscriptionData.subscription_start_date && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Started</p>
              <p className="font-medium">
                {new Date(subscriptionData.subscription_start_date).toLocaleDateString()}
              </p>
            </div>
            {subscriptionData.subscription_end_date && (
              <div>
                <p className="text-muted-foreground">Next Billing</p>
                <p className="font-medium">
                  {new Date(subscriptionData.subscription_end_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={managingSubscription}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {managingSubscription ? 'Opening...' : 'Manage Subscription'}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/subscription?profileId=${diggerProfileId}&upgrade=true`)}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Upgrade Coverage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
