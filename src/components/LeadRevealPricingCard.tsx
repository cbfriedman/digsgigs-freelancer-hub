/**
 * LeadRevealPricingCard - Displays pricing for revealing lead contact info
 * 
 * Shows:
 * - Lead reveal pricing based on geographic coverage and confirmation status
 * - Free leads remaining for subscribers
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Unlock, Gift, DollarSign, Crown, Loader2, MapPin, CheckCircle } from "lucide-react";
import { useClickPricing } from "@/hooks/useClickPricing";
import { FREE_LEADS_PER_MONTH, GeographicCoverage } from "@/config/clickPricing";

interface LeadRevealPricingCardProps {
  keyword: string;
  onRevealContact: () => void;
  isRevealing?: boolean;
  variant?: 'compact' | 'full';
  geographicCoverage?: GeographicCoverage;
  isConfirmedLead?: boolean;
}

export const LeadRevealPricingCard = ({
  keyword,
  onRevealContact,
  isRevealing = false,
  variant = 'full',
  geographicCoverage = 'local',
  isConfirmedLead = false,
}: LeadRevealPricingCardProps) => {
  const { pricingInfo, getLeadRevealPrice, isLoading, leadRevealPricing } = useClickPricing();
  
  const pricing = getLeadRevealPrice(keyword, geographicCoverage, isConfirmedLead);
  const isSubscriber = pricingInfo?.isSubscriber || pricingInfo?.isInGracePeriod || false;
  const freeLeads = pricingInfo?.accumulatedFreeClicks || 0;
  const isFreeLead = pricing.usedFreeLead;

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
          {isFreeLead ? (
            <>
              <Gift className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Free Lead!</span>
              <span className="text-xs text-muted-foreground">({pricing.remainingFreeLeads} remaining)</span>
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">${pricing.costDollars.toFixed(2)}</span>
              {isConfirmedLead && (
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
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
    <Card className={`border-2 ${isFreeLead ? 'border-green-500/50 bg-green-500/5' : isSubscriber ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isFreeLead ? (
            <>
              <Gift className="h-5 w-5 text-green-600" />
              <span className="text-green-600">Free Lead Available!</span>
            </>
          ) : (
            <>
              <Unlock className="h-5 w-5 text-primary" />
              Reveal Contact Info
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isFreeLead 
            ? `You have ${pricing.remainingFreeLeads + 1} free leads remaining this period`
            : isSubscriber 
              ? "Subscriber benefit: 2 free leads/month"
              : "Subscribe to get 2 free lead reveals per month"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing Display */}
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border/50">
          <div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>Cost to reveal contact</span>
              {isConfirmedLead && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified Lead
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${isFreeLead ? 'text-green-600' : 'text-primary'}`}>
                {isFreeLead ? 'FREE' : `$${pricing.costDollars.toFixed(2)}`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="capitalize">{geographicCoverage}</span>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Industry type:</span>
            <span className="capitalize">{pricing.industryType === 'highValue' ? 'High-Value' : 'Standard'}</span>
          </div>
          <div className="flex justify-between">
            <span>Geographic coverage:</span>
            <span className="capitalize">{geographicCoverage}</span>
          </div>
          {isConfirmedLead && (
            <div className="flex justify-between text-green-600">
              <span>Verified lead premium:</span>
              <span>+50%</span>
            </div>
          )}
        </div>

        {/* Free Leads Status for Subscribers */}
        {isSubscriber && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
            <Gift className="h-4 w-4 text-green-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-700 dark:text-green-400">
                {freeLeads} free lead{freeLeads !== 1 ? 's' : ''} remaining
              </div>
              <div className="text-xs text-muted-foreground">
                +{FREE_LEADS_PER_MONTH} added each month, unlimited accumulation
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
          ) : isFreeLead ? (
            <>
              <Gift className="mr-2 h-5 w-5" />
              Use Free Lead to Reveal
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
              Subscribers get {FREE_LEADS_PER_MONTH} free lead reveals per month
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
