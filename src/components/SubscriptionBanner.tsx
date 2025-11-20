import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

interface SubscriptionBannerProps {
  currentTier: string;
}

// Component disabled in exclusivity-based pricing model (no subscription tiers)
export const SubscriptionBanner = ({ currentTier }: SubscriptionBannerProps) => {
  return null;
};