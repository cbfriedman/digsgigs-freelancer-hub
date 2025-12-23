import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Map, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GeographicTier,
  IndustryType,
  BillingCycle,
  getSubscriptionTier,
  formatSubscriptionPrice,
  getAnnualSavings,
  GEOGRAPHIC_TIER_LABELS,
  GEOGRAPHIC_TIER_DESCRIPTIONS,
} from "@/config/subscriptionTiers";

interface GeographicTierSelectorProps {
  selectedTier: GeographicTier;
  industryType: IndustryType;
  billingCycle: BillingCycle;
  onTierChange: (tier: GeographicTier) => void;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  disabled?: boolean;
}

const tierIcons: Record<GeographicTier, React.ReactNode> = {
  local: <MapPin className="h-5 w-5" />,
  statewide: <Map className="h-5 w-5" />,
  nationwide: <Globe className="h-5 w-5" />,
};

export function GeographicTierSelector({
  selectedTier,
  industryType,
  billingCycle,
  onTierChange,
  onBillingCycleChange,
  disabled = false,
}: GeographicTierSelectorProps) {
  const tiers: GeographicTier[] = ['local', 'statewide', 'nationwide'];

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4 p-2 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => onBillingCycleChange('monthly')}
          disabled={disabled}
          className={cn(
            "px-4 py-2 rounded-md font-medium transition-all",
            billingCycle === 'monthly'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onBillingCycleChange('annual')}
          disabled={disabled}
          className={cn(
            "px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2",
            billingCycle === 'annual'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Annual
          <Badge variant="secondary" className="bg-accent text-accent-foreground text-xs">
            2 months free
          </Badge>
        </button>
      </div>

      {/* Geographic Tier Cards */}
      <RadioGroup
        value={selectedTier}
        onValueChange={(value) => onTierChange(value as GeographicTier)}
        disabled={disabled}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {tiers.map((tier) => {
          const tierData = getSubscriptionTier(tier, industryType);
          if (!tierData) return null;

          const price = billingCycle === 'monthly'
            ? tierData.monthly_price_cents
            : tierData.annual_price_cents;
          const isSelected = selectedTier === tier;
          const annualSavings = getAnnualSavings(tier, industryType);

          return (
            <Label
              key={tier}
              htmlFor={tier}
              className={cn(
                "cursor-pointer",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <Card
                className={cn(
                  "relative transition-all duration-200 hover:shadow-md",
                  isSelected && "ring-2 ring-primary border-primary shadow-md",
                  !isSelected && "hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {tierIcons[tier]}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{GEOGRAPHIC_TIER_LABELS[tier]}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="mb-4 min-h-[40px]">
                    {GEOGRAPHIC_TIER_DESCRIPTIONS[tier]}
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        {formatSubscriptionPrice(price)}
                      </span>
                      <span className="text-muted-foreground">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                    
                    {billingCycle === 'annual' && annualSavings > 0 && (
                      <p className="text-sm text-accent font-medium">
                        Save {formatSubscriptionPrice(annualSavings)}/year
                      </p>
                    )}
                    
                    {billingCycle === 'monthly' && (
                      <p className="text-xs text-muted-foreground">
                        {formatSubscriptionPrice(tierData.annual_price_cents)}/year if paid annually
                      </p>
                    )}
                  </div>
                  
                  <RadioGroupItem
                    value={tier}
                    id={tier}
                    className="sr-only"
                  />
                </CardContent>
              </Card>
            </Label>
          );
        })}
      </RadioGroup>

      {/* Industry Type Notice */}
      <div className="text-center text-sm text-muted-foreground">
        {industryType === 'hv' ? (
          <p>High-value industry pricing applied based on your profession</p>
        ) : (
          <p>Standard industry pricing applied</p>
        )}
      </div>
    </div>
  );
}
