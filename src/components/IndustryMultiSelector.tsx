import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, ChevronRight, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { INDUSTRY_PRICING, INDUSTRY_GROUPS, getLeadCostForIndustry, IndustryCategory, ValueIndicator } from "@/config/pricing";
import { LeadPricingChart } from "@/components/LeadPricingChart";
import { lookupCPC, findSimilarKeywords } from "@/utils/cpcLookup";

interface IndustryMultiSelectorProps {
  selectedIndustries: string[];
  onIndustriesChange: (industries: string[]) => void;
  onManageProfilesClick?: () => void;
}

export const IndustryMultiSelector = ({ selectedIndustries, onIndustriesChange, onManageProfilesClick }: IndustryMultiSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [leadsPerMonth, setLeadsPerMonth] = useState<string>("");
  const [exclusiveLeadsPerMonth, setExclusiveLeadsPerMonth] = useState<string>("");

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };
  
  const getValueBadgeColor = (indicator: ValueIndicator): string => {
    switch (indicator) {
      case 'LV':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'MV':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'HV':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
    }
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

  // Filter groups based on search query
  const filteredGroups = searchQuery.trim() === "" 
    ? INDUSTRY_GROUPS 
    : INDUSTRY_GROUPS.map(group => ({
        ...group,
        industries: group.industries.filter(industry =>
          industry.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(group => group.industries.length > 0);

  // Auto-expand categories with search results
  useEffect(() => {
    if (searchQuery.trim() !== "") {
      const categoriesWithResults = new Set(
        filteredGroups.map(group => group.categoryName)
      );
      setExpandedCategories(categoriesWithResults);
    }
  }, [searchQuery]);

  // Get highest lead cost from selected industries
  const getHighestLeadCost = (exclusivity: 'non-exclusive' | 'exclusive-24h'): number => {
    if (selectedIndustries.length === 0) {
      // Default to least expensive (low-value category minimum)
      return INDUSTRY_PRICING[0][exclusivity]; // Low-value services
    }
    return Math.max(...selectedIndustries.map(ind => getLeadCostForIndustry(ind, exclusivity)));
  };

  // Check if selected industries span multiple value categories
  const getSelectedCategories = (): Set<IndustryCategory> => {
    const categories = new Set<IndustryCategory>();
    selectedIndustries.forEach(industry => {
      const pricingCategory = INDUSTRY_PRICING.find(p => p.industries.includes(industry));
      if (pricingCategory) {
        categories.add(pricingCategory.category);
      }
    });
    return categories;
  };

  const selectedCategories = getSelectedCategories();
  const hasMultipleCategories = selectedCategories.size > 1;

  // Calculate total cost based on selected industries and lead quantities (both types)
  const calculatedCost = useMemo(() => {
    if ((!leadsPerMonth && !exclusiveLeadsPerMonth) || selectedIndustries.length === 0) return null;
    
    const nonExclusiveLeads = leadsPerMonth ? parseInt(leadsPerMonth) : 0;
    const exclusiveLeads = exclusiveLeadsPerMonth ? parseInt(exclusiveLeadsPerMonth) : 0;
    
    if ((isNaN(nonExclusiveLeads) || nonExclusiveLeads < 0) && (isNaN(exclusiveLeads) || exclusiveLeads < 0)) return null;
    if (nonExclusiveLeads === 0 && exclusiveLeads === 0) return null;
    
    const nonExclusiveCost = selectedIndustries.reduce((sum, industry) => {
      const costPerLead = getLeadCostForIndustry(industry, 'non-exclusive');
      return sum + (costPerLead * nonExclusiveLeads);
    }, 0);
    
    const exclusiveCost = selectedIndustries.reduce((sum, industry) => {
      const costPerLead = getLeadCostForIndustry(industry, 'exclusive-24h');
      return sum + (costPerLead * exclusiveLeads);
    }, 0);
    
    return { 
      nonExclusiveCost, 
      exclusiveCost,
      totalCost: nonExclusiveCost + exclusiveCost,
      nonExclusiveLeads, 
      exclusiveLeads,
      totalLeads: nonExclusiveLeads + exclusiveLeads
    };
  }, [leadsPerMonth, exclusiveLeadsPerMonth, selectedIndustries]);

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
                selectedIndustries.map(industry => (
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
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[700px] p-0 z-50" align="start">
          {/* Search Input */}
          <div className="sticky top-0 z-10 bg-background border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search professions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-2">
                Found {filteredGroups.reduce((acc, g) => acc + g.industries.length, 0)} results
              </p>
            )}
            
            {/* Value Legend */}
            <div className="mt-3 pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Value Tiers:</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-1.5 py-0">
                    LV
                  </Badge>
                  <span className="text-muted-foreground">
                    Low Value: ${INDUSTRY_PRICING[0].nonExclusive}-${INDUSTRY_PRICING[0].exclusive24h}/lead
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 px-1.5 py-0">
                    MV
                  </Badge>
                  <span className="text-muted-foreground">
                    Mid Value: ${INDUSTRY_PRICING[1].nonExclusive}-${INDUSTRY_PRICING[1].exclusive24h}/lead
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 px-1.5 py-0">
                    HV
                  </Badge>
                  <span className="text-muted-foreground">
                    High Value: ${INDUSTRY_PRICING[2].nonExclusive}-${INDUSTRY_PRICING[2].exclusive24h}/lead
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[450px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="px-4 py-3 space-y-3">
                <div className="text-center text-sm text-muted-foreground">
                  No professions found matching "{searchQuery}"
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const cpcData = lookupCPC(searchQuery);
                    let valueIndicator: 'LV' | 'MV' | 'HV' = 'MV';
                    
                    if (cpcData) {
                      // Map the CPC value indicator to our format
                      valueIndicator = cpcData.valueIndicator === 'low-value' ? 'LV' : 
                                     cpcData.valueIndicator === 'mid-value' ? 'MV' : 'HV';
                    } else {
                      // If no CPC data found, try to find similar keywords
                      const similar = findSimilarKeywords(searchQuery, 1);
                      if (similar.length > 0) {
                        valueIndicator = similar[0].valueIndicator === 'low-value' ? 'LV' : 
                                       similar[0].valueIndicator === 'mid-value' ? 'MV' : 'HV';
                      }
                    }
                    
                    // Add the custom industry
                    toggleIndustry(searchQuery);
                    setSearchQuery('');
                  }}
                  className="w-full"
                  size="sm"
                >
                  Add "{searchQuery}" as {(() => {
                    const cpcData = lookupCPC(searchQuery);
                    if (cpcData) {
                      return cpcData.valueIndicator === 'low-value' ? 'Low Value' : 
                             cpcData.valueIndicator === 'mid-value' ? 'Mid Value' : 'High Value';
                    }
                    const similar = findSimilarKeywords(searchQuery, 1);
                    if (similar.length > 0) {
                      return similar[0].valueIndicator === 'low-value' ? 'Low Value' : 
                             similar[0].valueIndicator === 'mid-value' ? 'Mid Value' : 'High Value';
                    }
                    return 'Mid Value';
                  })()} profession
                </Button>
              </div>
            ) : (
              filteredGroups.map((group) => (
              <div key={group.categoryName} className="border-b last:border-b-0">
                {/* Category Header */}
                <button
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
                  onClick={() => toggleCategory(group.categoryName)}
                >
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(group.categoryName) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold text-sm">
                      {group.categoryName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {group.industries.length} services
                  </span>
                </button>

                {/* Category Industries */}
                {expandedCategories.has(group.categoryName) && (
                  <div className="bg-accent/5 divide-y">
                    {group.industries.map((industry) => {
                      const isSelected = selectedIndustries.includes(industry.name);
                      const nonExclusiveCost = getLeadCostForIndustry(industry.name, 'non-exclusive');
                      const exclusiveCost = getLeadCostForIndustry(industry.name, 'exclusive-24h');
                      return (
                        <div
                          key={industry.name}
                          className="px-4 py-2 pl-10 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <span className="text-sm truncate">{industry.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs px-1.5 py-0 ${getValueBadgeColor(industry.indicator)}`}
                            >
                              {industry.indicator}
                            </Badge>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              <div className="font-medium">Non-Exclusive: ${nonExclusiveCost}</div>
                              <div>24hr Exclusive: ${exclusiveCost}</div>
                            </div>
                            <Button
                              size="sm"
                              variant={isSelected ? "secondary" : "default"}
                              className="h-7 px-3 text-xs"
                              onClick={() => toggleIndustry(industry.name)}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
            )}
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
        <div className="space-y-3">
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
            <p className="text-sm font-semibold text-center">
              Your lead costs (based on highest value selection):
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Non-Exclusive:</span>{' '}
                <strong className="text-primary">${getHighestLeadCost('non-exclusive')}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">24hr Exclusive:</span>{' '}
                <strong className="text-primary">${getHighestLeadCost('exclusive-24h')}</strong>
              </div>
            </div>
          </div>

          {/* Lead Quantity Selector and Cost Calculator */}
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">How many non-exclusive leads would you like per month?</label>
              <Input
                type="number"
                min="0"
                placeholder="Enter number of leads..."
                value={leadsPerMonth}
                onChange={(e) => setLeadsPerMonth(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">How many 24hr exclusive leads would you like per month?</label>
              <Input
                type="number"
                min="0"
                placeholder="Enter number of leads..."
                value={exclusiveLeadsPerMonth}
                onChange={(e) => setExclusiveLeadsPerMonth(e.target.value)}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Priority placement with 24-hour exclusivity
              </div>
            </div>

            {/* Cost Calculator Display */}
            {calculatedCost && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Selected Industries:</span>
                    <span className="text-sm">{selectedIndustries.length}</span>
                  </div>
                  
                  {calculatedCost.nonExclusiveLeads > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Non-Exclusive Leads:</span>
                        <span className="text-sm">{calculatedCost.nonExclusiveLeads}/month</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Non-Exclusive Cost:</span>
                        <span className="text-sm font-medium">
                          ${calculatedCost.nonExclusiveCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {calculatedCost.exclusiveLeads > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">24hr Exclusive Leads:</span>
                        <span className="text-sm">{calculatedCost.exclusiveLeads}/month</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Exclusive Cost:</span>
                        <span className="text-sm font-medium">
                          ${calculatedCost.exclusiveCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Monthly Cost:</span>
                      <span className="text-lg font-bold text-primary">
                        ${calculatedCost.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculatedCost.totalLeads} total leads per month
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Multiple Categories Warning */}
          {hasMultipleCategories && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Pro Tip: Optimize Your Lead Costs
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    You've selected industries from different pricing categories. To get the best rates:
                  </p>
                  <ul className="text-xs text-amber-800 dark:text-amber-200 list-disc list-inside space-y-0.5 ml-2">
                    <li><strong>Complete this registration first</strong></li>
                    <li>Then create separate profiles for each pricing tier</li>
                    <li>Pay only the appropriate rate for each industry</li>
                    <li>Avoid paying high-value rates for low-value leads</li>
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 text-xs border-amber-400 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900"
                    onClick={() => {
                      if (onManageProfilesClick) {
                        onManageProfilesClick();
                      } else {
                        window.location.href = '/my-profiles';
                      }
                    }}
                  >
                    Manage Your Profiles
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
