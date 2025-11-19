import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { PRICING_TIERS } from "@/config/pricing";

interface SubscriptionBannerProps {
  currentTier: string;
}

export const SubscriptionBanner = ({ currentTier }: SubscriptionBannerProps) => {
  if (currentTier !== 'free') return null;

  return (
    <Alert className="mb-6 border-primary bg-primary/5">
      <Crown className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        Upgrade to Pro or Premium
        <TrendingUp className="h-4 w-4" />
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>Get unlimited lead access and lower costs:</p>
        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
          <li><strong>Pro ({PRICING_TIERS.pro.price}/month)</strong>: {PRICING_TIERS.pro.leadCost}/lead + {PRICING_TIERS.pro.escrowProcessingFee}</li>
          <li><strong>Premium ({PRICING_TIERS.premium.price}/month)</strong>: {PRICING_TIERS.premium.leadCost}/lead + {PRICING_TIERS.premium.escrowProcessingFee}</li>
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
