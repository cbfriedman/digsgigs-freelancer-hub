/**
 * LeadRevealPricingCard - Displays pricing for revealing lead contact info
 * 
 * Shows:
 * - Subscriber pricing (65% of Angi/Bark CPL)
 * - Non-subscriber pricing (90% of Angi/Bark CPL)
 * - Free clicks remaining for subscribers
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Unlock, Gift, DollarSign, Crown, Loader2 } from "lucide-react";
import { useClickPricing } from "@/hooks/useClickPricing";
import { SUBSCRIBER_CPL_MULTIPLIER, NON_SUBSCRIBER_CPL_MULTIPLIER } from "@/config/clickPricing";

interface LeadRevealPricingCardProps {
  keyword: string;
  onRevealContact: () => void;
  isRevealing?: boolean;
  variant?: 'compact' | 'full';
}

export const LeadRevealPricingCard = ({
  keyword,
  onRevealContact,
  isRevealing = false,
  variant = 'full',
}: LeadRevealPricingCardProps) => {
  const { pricingInfo, getLeadRevealPrice, isLoading } = useClickPricing();
  
  const pricing = getLeadRevealPrice(keyword);
  const isSubscriber = pricingInfo?.isSubscriber || pricingInfo?.isInGracePeriod || false;
  const freeClicks = pricingInfo?.accumulatedFreeClicks || 0;
  const isFreeClick = pricing.usedFreeClick;
  const discountPercent = isSubscriber ? Math.round((1 - SUBSCRIBER_CPL_MULTIPLIER) * 100) : Math.round((1 - NON_SUBSCRIBER_CPL_MULTIPLIER) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          {isFreeClick ? (
            <>
              <Gift className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Free Click!</span>
              <span className="text-xs text-muted-foreground">({pricing.remainingFreeClicks} remaining)</span>
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">${pricing.costDollars.toFixed(2)}</span>
              {isSubscriber && (
                <Badge variant="secondary" className="text-xs">
                  {discountPercent}% off
                </Badge>
              )}
            </>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={onRevealContact}
          disabled={isRevealing}
        >
          {isRevealing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Unlock className="h-4 w-4 mr-1" />
              Reveal
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className={`border-2 ${isFreeClick ? 'border-green-500/50 bg-green-500/5' : isSubscriber ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isFreeClick ? (
            <>
              <Gift className="h-5 w-5 text-green-600" />
              <span className="text-green-600">Free Click Available!</span>
            </>
          ) : (
            <>
              <Unlock className="h-5 w-5 text-primary" />
              Reveal Contact Info
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isFreeClick 
            ? `You have ${pricing.remainingFreeClicks + 1} free clicks remaining this period`
            : isSubscriber 
              ? "Subscriber discount applied to this lead"
              : "Subscribe to get 65% off lead prices + 2 free clicks/month"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing Display */}
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border/50">
          <div>
            <div className="text-sm text-muted-foreground">Cost to reveal contact</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${isFreeClick ? 'text-green-600' : 'text-primary'}`}>
                {isFreeClick ? 'FREE' : `$${pricing.costDollars.toFixed(2)}`}
              </span>
              {!isFreeClick && isSubscriber && (
                <span className="text-sm line-through text-muted-foreground">
                  ${pricing.baseCplDollars.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          
          {isSubscriber && !isFreeClick && (
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Crown className="h-3 w-3 mr-1" />
              {discountPercent}% Subscriber Discount
            </Badge>
          )}
        </div>

        {/* Pricing Breakdown */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Angi/Bark baseline CPL:</span>
            <span>${pricing.baseCplDollars.toFixed(2)}</span>
          </div>
          {isSubscriber && (
            <div className="flex justify-between text-green-600">
              <span>Subscriber rate (65%):</span>
              <span>${(pricing.baseCplDollars * SUBSCRIBER_CPL_MULTIPLIER).toFixed(2)}</span>
            </div>
          )}
          {!isSubscriber && (
            <div className="flex justify-between">
              <span>Non-subscriber rate (90%):</span>
              <span>${pricing.costDollars.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Free Clicks Status for Subscribers */}
        {isSubscriber && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
            <Gift className="h-4 w-4 text-green-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-700 dark:text-green-400">
                {freeClicks} free click{freeClicks !== 1 ? 's' : ''} remaining
              </div>
              <div className="text-xs text-muted-foreground">
                +2 added each month, unlimited accumulation
              </div>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={onRevealContact}
          disabled={isRevealing}
        >
          {isRevealing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : isFreeClick ? (
            <>
              <Gift className="mr-2 h-5 w-5" />
              Use Free Click to Reveal
            </>
          ) : (
            <>
              <Unlock className="mr-2 h-5 w-5" />
              Reveal for ${pricing.costDollars.toFixed(2)}
            </>
          )}
        </Button>

        {/* Subscribe CTA for non-subscribers */}
        {!isSubscriber && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Subscribers save 35% on every lead + get 2 free clicks/month
            </p>
            <Button variant="link" size="sm" className="text-primary">
              Learn about subscription benefits →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadRevealPricingCard;
