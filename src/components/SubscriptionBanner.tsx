import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

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
        <p>Get unlimited lead access and lower commission rates:</p>
        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
          <li><strong>Pro ($10/month)</strong>: 4% commission instead of 15%</li>
          <li><strong>Premium ($150/month)</strong>: 0% commission - keep 100%!</li>
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
