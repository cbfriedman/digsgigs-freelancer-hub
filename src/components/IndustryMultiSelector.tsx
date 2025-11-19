import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { INDUSTRY_PRICING, getLeadCostForIndustry, IndustryCategory } from "@/config/pricing";

interface IndustryMultiSelectorProps {
  selectedIndustries: string[];
  onIndustriesChange: (industries: string[]) => void;
}

export const IndustryMultiSelector = ({ selectedIndustries, onIndustriesChange }: IndustryMultiSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<IndustryCategory>>(new Set(['mid-value']));

  const toggleCategory = (category: IndustryCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleIndustry = (industry: string) => {
    const newSelected = selectedIndustries.includes(industry)
      ? selectedIndustries.filter(i => i !== industry)
      : [...selectedIndustries, industry];
    onIndustriesChange(newSelected);
  };

  const removeIndustry = (industry: string) => {
    onIndustriesChange(selectedIndustries.filter(i => i !== industry));
  };

  const getCategoryLabel = (category: IndustryCategory): string => {
    switch (category) {
      case 'low-value':
        return '💼 Low-Value Services';
      case 'mid-value':
        return '🏗️ Mid-Value Services';
      case 'high-value':
        return '⭐ High-Value Services';
    }
  };

  const getCategoryPriceRange = (category: IndustryCategory): string => {
    const pricing = INDUSTRY_PRICING.find(p => p.category === category);
    if (!pricing) return '';
    return `$${pricing.premium}-${pricing.free}/lead`;
  };

  // Get highest lead cost from selected industries
  const getHighestLeadCost = (tier: 'free' | 'pro' | 'premium'): number => {
    if (selectedIndustries.length === 0) {
      return getLeadCostForIndustry('HVAC', tier); // Default
    }
    return Math.max(...selectedIndustries.map(ind => getLeadCostForIndustry(ind, tier)));
  };

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-auto min-h-12 justify-between hover:bg-accent"
          >
            <div className="flex flex-wrap gap-1.5 flex-1">
              {selectedIndustries.length === 0 ? (
                <span className="text-muted-foreground">Select industries...</span>
              ) : (
                selectedIndustries.slice(0, 3).map(industry => (
                  <Badge
                    key={industry}
                    variant="secondary"
                    className="px-2 py-0.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeIndustry(industry);
                    }}
                  >
                    {industry}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))
              )}
              {selectedIndustries.length > 3 && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                  +{selectedIndustries.length - 3} more
                </Badge>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 z-50" align="start">
          <div className="max-h-[500px] overflow-y-auto">
            {INDUSTRY_PRICING.map((pricingCategory) => (
              <div key={pricingCategory.category} className="border-b last:border-b-0">
                {/* Category Header */}
                <button
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
                  onClick={() => toggleCategory(pricingCategory.category)}
                >
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(pricingCategory.category) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold text-sm">
                      {getCategoryLabel(pricingCategory.category)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getCategoryPriceRange(pricingCategory.category)}
                  </span>
                </button>

                {/* Category Industries */}
                {expandedCategories.has(pricingCategory.category) && (
                  <div className="bg-accent/5">
                    {pricingCategory.industries.map((industry) => {
                      const isSelected = selectedIndustries.includes(industry);
                      return (
                        <button
                          key={industry}
                          className="w-full px-4 py-2 pl-10 text-left hover:bg-accent/50 transition-colors flex items-center justify-between group"
                          onClick={() => toggleIndustry(industry)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <span className="text-sm">{industry}</span>
                          </div>
                          <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            ${pricingCategory.premium}-${pricingCategory.free}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {selectedIndustries.length > 0 && (
            <>
              <Separator />
              <div className="p-3 bg-muted/30">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Selected: {selectedIndustries.length} {selectedIndustries.length === 1 ? 'industry' : 'industries'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onIndustriesChange([])}
                >
                  Clear all
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Pricing Display */}
      {selectedIndustries.length > 0 && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
          <p className="text-sm font-semibold text-center">
            Your lead costs (based on highest value selection):
          </p>
          <div className="flex justify-center gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Free Tier:</span>{' '}
              <strong className="text-primary">${getHighestLeadCost('free')}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Pro Tier:</span>{' '}
              <strong className="text-primary">${getHighestLeadCost('pro')}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Premium Tier:</span>{' '}
              <strong className="text-primary">${getHighestLeadCost('premium')}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
