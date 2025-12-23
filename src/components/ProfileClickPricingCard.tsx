/**
 * ProfileClickPricingCard - Displays pricing for viewing/calling digger profiles
 * 
 * Shows:
 * - Per-click cost (75% of Google avg PPC)
 * - Per-call cost (100% of Google high PPC)
 * - Industry-based pricing transparency
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Eye, DollarSign, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProfilePricing } from "@/hooks/useClickPricing";

interface ProfileClickPricingCardProps {
  profession: string;
  onViewProfile?: () => void;
  onCallDigger?: () => void;
  isUnlocking?: boolean;
  isCalling?: boolean;
  showActions?: boolean;
  variant?: 'compact' | 'full';
}

export const ProfileClickPricingCard = ({
  profession,
  onViewProfile,
  onCallDigger,
  isUnlocking = false,
  isCalling = false,
  showActions = true,
  variant = 'full',
}: ProfileClickPricingCardProps) => {
  const { getClickPrice, getCallPrice } = useProfilePricing();
  
  const clickPricing = getClickPrice(profession);
  const callPricing = getCallPrice(profession);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border border-border/50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">${clickPricing.costDollars.toFixed(2)}/view</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>75% of Google's avg PPC (${clickPricing.googleAvgCpcDollars.toFixed(2)})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="h-4 w-px bg-border" />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">${callPricing.costDollars.toFixed(2)}/call</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>100% of Google's high PPC (${callPricing.googleHighCpcDollars.toFixed(2)})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          Contact Pricing
        </CardTitle>
        <CardDescription>
          Diggers pay when giggers view their profile or call them
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Click Pricing */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium">Profile View</div>
              <div className="text-xs text-muted-foreground">
                75% of Google avg PPC
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-primary">
              ${clickPricing.costDollars.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              (vs ${clickPricing.googleAvgCpcDollars.toFixed(2)} on Google)
            </div>
          </div>
        </div>

        {/* Call Pricing */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-accent/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent/10">
              <Phone className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="font-medium">Phone Call</div>
              <div className="text-xs text-muted-foreground">
                100% of Google high PPC
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-accent">
              ${callPricing.costDollars.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              (matching ${callPricing.googleHighCpcDollars.toFixed(2)} on Google)
            </div>
          </div>
        </div>

        {/* Industry Badge */}
        {clickPricing.industryMatched && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {clickPricing.industryMatched}
            </Badge>
            {clickPricing.keywordMatched && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Matched keyword: "{clickPricing.keywordMatched}"</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-3 pt-2">
            {onViewProfile && (
              <Button 
                className="flex-1" 
                onClick={onViewProfile}
                disabled={isUnlocking}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isUnlocking ? 'Processing...' : `View Profile ($${clickPricing.costDollars.toFixed(2)})`}
              </Button>
            )}
            {onCallDigger && (
              <Button 
                variant="secondary"
                className="flex-1" 
                onClick={onCallDigger}
                disabled={isCalling}
              >
                <Phone className="h-4 w-4 mr-2" />
                {isCalling ? 'Connecting...' : `Call ($${callPricing.costDollars.toFixed(2)})`}
              </Button>
            )}
          </div>
        )}

        {/* Savings Note */}
        <div className="text-xs text-center text-muted-foreground pt-2 border-t border-border/50">
          <span className="text-green-600 font-medium">Save up to 25%</span> compared to Google Ads for profile views
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileClickPricingCard;
