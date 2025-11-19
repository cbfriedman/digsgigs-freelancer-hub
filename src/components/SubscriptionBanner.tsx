import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { PRICING_TIERS, INDUSTRY_PRICING } from "@/config/pricing";

interface SubscriptionBannerProps {
  currentTier: string;
}

export const SubscriptionBanner = ({ currentTier }: SubscriptionBannerProps) => {
  if (currentTier !== 'free') return null;

  // Use mid-value industry pricing as example
  const midValuePricing = INDUSTRY_PRICING[1];

  return (
    <Alert className="mb-6 border-primary bg-primary/5">
      <Crown className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        Upgrade to Pro or Premium
        <TrendingUp className="h-4 w-4" />
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>Get lower lead costs and escrow fees:</p>
        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
          <li><strong>Pro ({PRICING_TIERS.pro.price}/month)</strong>: Lower lead costs + {PRICING_TIERS.pro.escrowFee} escrow fee</li>
          <li><strong>Premium ({PRICING_TIERS.premium.price}/month)</strong>: Lowest lead costs + {PRICING_TIERS.premium.escrowFee} escrow fee</li>
          <li className="text-xs text-muted-foreground">Lead costs vary by industry (e.g., ${midValuePricing.pro}-${midValuePricing.premium}/lead)</li>
        </ul>
        <div className="pt-2">
          <Button asChild size="sm">
            <Link to="/digger-subscription">View Plans</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
