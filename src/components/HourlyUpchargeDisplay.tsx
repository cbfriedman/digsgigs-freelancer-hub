import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HourlyUpchargeDisplayProps {
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  subscriptionTier: string | null;
  variant?: 'default' | 'compact';
}

export const HourlyUpchargeDisplay = ({ 
  hourlyRateMin, 
  hourlyRateMax, 
  subscriptionTier,
  variant = 'default'
}: HourlyUpchargeDisplayProps) => {
  // Calculate average rate
  const min = hourlyRateMin || 0;
  const max = hourlyRateMax || 0;
  const averageRate = (min + max) / 2;

  // Get tier multiplier
  const tier = subscriptionTier || 'free';
  const multipliers: Record<string, number> = { free: 3, pro: 2, premium: 1 };
  const multiplier = multipliers[tier] || 3;

  // Calculate upcharge
  const upcharge = averageRate * multiplier;

  // If no hourly rate is set, don't display anything
  if (averageRate === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Hourly Award Upcharge:</span>
        <span className="font-semibold text-primary">${upcharge.toFixed(2)}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Average hourly rate (${averageRate.toFixed(2)}) × {multiplier} hours = ${upcharge.toFixed(2)}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm mb-1">Hourly Award Upcharge</h4>
              <p className="text-xs text-muted-foreground">
                Charged when you win an hourly project
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    This is calculated based on your average hourly rate and subscription tier multiplier
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Hourly Rate Range:</span>
              <span className="font-medium">${min} - ${max}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Rate:</span>
              <span className="font-medium">${averageRate.toFixed(2)}/hr</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tier Multiplier ({tier}):</span>
              <span className="font-medium">{multiplier}x hours</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Upcharge:</span>
              <span className="font-bold text-lg text-primary">${upcharge.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Formula: Average Rate (${averageRate.toFixed(2)}) × Tier Multiplier ({multiplier}) = ${upcharge.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
