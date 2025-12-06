import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, DollarSign, Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GOOGLE_CPC_KEYWORDS, type IndustryCpcData } from "@/config/googleCpcKeywords";

interface CompetitorPlatform {
  name: string;
  costModel: "cpc" | "cpl" | "percentage" | "subscription";
  avgCost: number;
  clickToLeadRate?: number;
  description: string;
}

const COMPETITOR_PLATFORMS: CompetitorPlatform[] = [
  {
    name: "Google AdWords",
    costModel: "cpc",
    avgCost: 16,
    clickToLeadRate: 0.07,
    description: "Pay-per-click advertising with industry-specific costs"
  },
  {
    name: "Facebook Ads",
    costModel: "cpl",
    avgCost: 45,
    description: "Average cost per lead across service industries"
  },
  {
    name: "Yelp Ads",
    costModel: "cpl",
    avgCost: 35,
    description: "Cost per qualified lead from Yelp advertising"
  },
  {
    name: "Angi (Angie's List)",
    costModel: "cpl",
    avgCost: 50,
    description: "Average cost per lead for home service professionals"
  },
  {
    name: "Home Advisor",
    costModel: "cpl",
    avgCost: 60,
    description: "Cost per lead with additional membership fees"
  },
  {
    name: "Thumbtack",
    costModel: "cpl",
    avgCost: 25,
    description: "Variable cost per lead based on service type"
  },
  {
    name: "Bark",
    costModel: "cpl",
    avgCost: 20,
    description: "Pay-per-lead for service professionals"
  },
  {
    name: "Porch",
    costModel: "cpl",
    avgCost: 50,
    description: "Cost per lead for home service professionals"
  },
  {
    name: "Houzz",
    costModel: "cpl",
    avgCost: 45,
    description: "Lead generation for home improvement and design professionals"
  },
];

// Default conversion rates by category
const DEFAULT_CONVERSION_RATES: Record<string, number> = {
  'high-value': 0.12,
  'mid-value': 0.18,
  'low-value': 0.25,
};

// Group industries by category for the dropdown
const getIndustryCategories = () => {
  const categories: Record<string, IndustryCpcData[]> = {
    'high-value': [],
    'mid-value': [],
    'low-value': [],
  };
  
  GOOGLE_CPC_KEYWORDS.forEach(industry => {
    categories[industry.category].push(industry);
  });
  
  return categories;
};

export const ROIComparisonCalculator = () => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("HVAC");
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("Google AdWords");
  const [conversionRate, setConversionRate] = useState<string>("18");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const industryCategories = useMemo(() => getIndustryCategories(), []);
  
  const industry = useMemo(() => 
    GOOGLE_CPC_KEYWORDS.find(i => i.industry === selectedIndustry) || GOOGLE_CPC_KEYWORDS[0],
    [selectedIndustry]
  );
  
  const competitor = COMPETITOR_PLATFORMS.find(c => c.name === selectedCompetitor) || COMPETITOR_PLATFORMS[0];
  const platformConversionRate = parseFloat(conversionRate) / 100 || 0.18;

  // Update conversion rate based on industry category
  useEffect(() => {
    const defaultRate = DEFAULT_CONVERSION_RATES[industry.category] || 0.18;
    setConversionRate((defaultRate * 100).toFixed(0));
  }, [industry.category]);

  // Filter industries based on search term
  const filteredCategories = useMemo(() => {
    const result: Record<string, IndustryCpcData[]> = {};
    
    Object.entries(industryCategories).forEach(([category, industries]) => {
      const filtered = industries.filter(ind =>
        ind.industry.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        result[category] = filtered;
      }
    });
    
    return result;
  }, [industryCategories, searchTerm]);

  // Use industry's averageCpc from GOOGLE_CPC_KEYWORDS
  const industryCPC = industry.averageCpc;
  const clickToLeadRate = 0.07; // Standard 7% click-to-lead rate
  const leadToCustomerRate = platformConversionRate;

  // Calculate competitor cost per closed deal based on their model
  let competitorCostPerLead: number;
  let competitorCostPerDeal: number;
  
  if (competitor.costModel === "cpc") {
    // For CPC models like Google AdWords - use actual industry CPC
    const clicksPerLead = 1 / clickToLeadRate;
    competitorCostPerLead = industryCPC * clicksPerLead;
    competitorCostPerDeal = competitorCostPerLead / leadToCustomerRate;
  } else if (competitor.costModel === "cpl") {
    // For CPL models - use competitor's average cost
    competitorCostPerLead = competitor.avgCost;
    competitorCostPerDeal = competitorCostPerLead / leadToCustomerRate;
  } else if (competitor.costModel === "percentage") {
    const avgJobValue = 1000;
    competitorCostPerLead = avgJobValue * (competitor.avgCost / 100);
    competitorCostPerDeal = competitorCostPerLead / leadToCustomerRate;
  } else {
    competitorCostPerLead = competitor.avgCost;
    competitorCostPerDeal = competitorCostPerLead / leadToCustomerRate;
  }

  // Calculate platform costs per lead based on exclusivity (using actual industry CPC)
  // Pricing: Non-Exclusive Unconfirmed 25%, Non-Exclusive Confirmed 30%, Semi-Exclusive 50%, 24hr Exclusive 90%
  const roundToNearestHalf = (value: number) => Math.ceil(value * 2) / 2;
  
  const platformCosts = {
    nonExclusiveUnconfirmed: roundToNearestHalf(industryCPC * 0.25),
    nonExclusiveConfirmed: roundToNearestHalf(industryCPC * 0.30),
    semiExclusive: roundToNearestHalf(industryCPC * 0.50),
    exclusive24h: roundToNearestHalf(industryCPC * 0.90),
  };

  const platformCostPerDeal = {
    nonExclusiveUnconfirmed: platformCosts.nonExclusiveUnconfirmed / platformConversionRate,
    nonExclusiveConfirmed: platformCosts.nonExclusiveConfirmed / platformConversionRate,
    semiExclusive: platformCosts.semiExclusive / platformConversionRate,
    exclusive24h: platformCosts.exclusive24h / platformConversionRate,
  };

  const savings = {
    nonExclusiveUnconfirmed: competitorCostPerDeal - platformCostPerDeal.nonExclusiveUnconfirmed,
    nonExclusiveConfirmed: competitorCostPerDeal - platformCostPerDeal.nonExclusiveConfirmed,
    semiExclusive: competitorCostPerDeal - platformCostPerDeal.semiExclusive,
    exclusive24h: competitorCostPerDeal - platformCostPerDeal.exclusive24h,
  };

  const savingsPercent = {
    nonExclusiveUnconfirmed: (savings.nonExclusiveUnconfirmed / competitorCostPerDeal) * 100,
    nonExclusiveConfirmed: (savings.nonExclusiveConfirmed / competitorCostPerDeal) * 100,
    semiExclusive: (savings.semiExclusive / competitorCostPerDeal) * 100,
    exclusive24h: (savings.exclusive24h / competitorCostPerDeal) * 100,
  };

  const categoryLabels: Record<string, string> = {
    'high-value': 'High-Value Industries',
    'mid-value': 'Mid-Value Industries',
    'low-value': 'Low-Value Industries',
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-accent/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Cost Per Closed Deal: DigsandGigs vs. {competitor.name}</CardTitle>
        </div>
        <CardDescription>
          See how much you save using Digsandgigs compared to {competitor.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="competitor">Compare DigsandGigs to our competitors</Label>
          <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
            <SelectTrigger id="competitor">
              <SelectValue placeholder="Select competitor" />
            </SelectTrigger>
            <SelectContent>
              {COMPETITOR_PLATFORMS.map((comp) => (
                <SelectItem key={comp.name} value={comp.name}>
                  {comp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{competitor.description}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="industry">Your Industry</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-2">How to use this calculator:</p>
                    <ul className="text-sm space-y-1 list-disc pl-4">
                      <li>Select a competitor platform to compare</li>
                      <li>Select your industry from the dropdown</li>
                      <li>Adjust your Lead-to-Award Rate (what % of leads you typically close)</li>
                      <li>The calculator shows your cost per closed deal on DigsandGigs vs the competitor</li>
                    </ul>
                    <p className="text-sm mt-2 pt-2 border-t">
                      <strong>CPC values are from real Google Ads data</strong> for each industry.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              type="text"
              placeholder="Search industries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.keys(filteredCategories).length > 0 ? (
                  Object.entries(filteredCategories).map(([category, industries]) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{categoryLabels[category] || category}</SelectLabel>
                      {industries.map((ind) => (
                        <SelectItem key={ind.industry} value={ind.industry}>
                          {ind.industry} (${ind.averageCpc} CPC)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                ) : (
                  <SelectItem value="no-results" disabled>
                    No industries found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selected: <span className="font-semibold text-primary">${industryCPC}</span> avg. Google CPC
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="conversion">Your Lead-to-Award Rate (%)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-2">What is Lead-to-Award Rate?</p>
                    <p className="text-sm mb-2">
                      This is the percentage of leads you contact that result in closed deals and paid work.
                    </p>
                    <p className="text-sm mb-2">
                      <strong>Example:</strong> If you contact 100 leads and win 25 jobs, your rate is 25%.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Industry average ranges from 12-25% depending on your service, pricing, and follow-up process.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="conversion"
              type="number"
              min="0"
              max="100"
              value={conversionRate}
              onChange={(e) => setConversionRate(e.target.value)}
              placeholder="18"
              className="text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold text-sm text-muted-foreground">{competitor.name}</h4>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {competitor.costModel === "cpc" ? (
                <>
                  <p>Avg CPC: <span className="font-semibold text-foreground">${industryCPC}</span></p>
                  <p>Click-to-Lead: {(clickToLeadRate * 100).toFixed(0)}%</p>
                  <p className="font-semibold text-foreground">True Cost Per Lead: ${competitorCostPerLead.toFixed(0)}</p>
                </>
              ) : competitor.costModel === "cpl" ? (
                <>
                  <p>Cost Per Lead: ${competitor.avgCost}</p>
                </>
              ) : (
                <p>Commission: {competitor.avgCost}%</p>
              )}
              <p>Lead-to-Customer: {(leadToCustomerRate * 100).toFixed(0)}%</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-2xl font-bold text-destructive">
                ${competitorCostPerDeal.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">per closed deal</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm text-primary">Digsandgigs Platform</h4>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Non-Exclusive Unconfirmed <span className="text-primary">(25% of CPC)</span></p>
                <p className="text-2xl font-bold text-primary">
                  ${platformCostPerDeal.nonExclusiveUnconfirmed.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">per closed deal • ${platformCosts.nonExclusiveUnconfirmed.toFixed(2)}/lead</p>
              </div>
              <div className="pt-2 border-t border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Non-Exclusive Confirmed <span className="text-primary">(30% of CPC)</span></p>
                <p className="text-xl font-bold text-foreground">
                  ${platformCostPerDeal.nonExclusiveConfirmed.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">per closed deal • ${platformCosts.nonExclusiveConfirmed.toFixed(2)}/lead</p>
              </div>
              <div className="pt-2 border-t border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Semi-Exclusive <span className="text-primary">(50% of CPC)</span></p>
                <p className="text-lg font-semibold text-foreground">
                  ${platformCostPerDeal.semiExclusive.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">per closed deal • ${platformCosts.semiExclusive.toFixed(2)}/lead</p>
              </div>
              <div className="pt-2 border-t border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">24hr Exclusive <span className="text-primary">(90% of CPC)</span></p>
                <p className="text-lg font-semibold text-foreground">
                  ${platformCostPerDeal.exclusive24h.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">per closed deal • ${platformCosts.exclusive24h.toFixed(2)}/lead</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            How We Calculate These Numbers
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <h5 className="font-semibold text-sm mb-2">{competitor.name} Calculation</h5>
              <div className="space-y-2 text-xs text-muted-foreground">
                {competitor.costModel === "cpc" ? (
                  <>
                    <div>
                      <p className="font-semibold text-foreground">True Cost Per Lead:</p>
                      <p>CPC ÷ Click-to-Lead Rate</p>
                      <p className="text-primary">${industryCPC} ÷ {(clickToLeadRate * 100).toFixed(0)}% = ${competitorCostPerLead.toFixed(0)}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-foreground">Cost Per Closed Deal:</p>
                      <p>True Cost Per Lead ÷ Lead-to-Customer Rate</p>
                      <p className="text-destructive">${competitorCostPerLead.toFixed(0)} ÷ {(leadToCustomerRate * 100).toFixed(0)}% = ${competitorCostPerDeal.toFixed(0)}</p>
                    </div>
                  </>
                ) : competitor.costModel === "cpl" ? (
                  <>
                    <div>
                      <p className="font-semibold text-foreground">Cost Per Lead:</p>
                      <p className="text-primary">${competitor.avgCost}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-foreground">Cost Per Closed Deal:</p>
                      <p>Cost Per Lead ÷ Lead-to-Customer Rate</p>
                      <p className="text-destructive">${competitorCostPerLead.toFixed(0)} ÷ {(leadToCustomerRate * 100).toFixed(0)}% = ${competitorCostPerDeal.toFixed(0)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-semibold text-foreground">Effective Cost Per Lead:</p>
                      <p className="text-primary">${competitorCostPerLead.toFixed(0)}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-foreground">Cost Per Closed Deal:</p>
                      <p>Effective Cost ÷ Lead-to-Customer Rate</p>
                      <p className="text-destructive">${competitorCostPerLead.toFixed(0)} ÷ {(leadToCustomerRate * 100).toFixed(0)}% = ${competitorCostPerDeal.toFixed(0)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-primary/5">
              <h5 className="font-semibold text-sm mb-2">Digsandgigs Platform Calculation</h5>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground">Lead Cost by Exclusivity:</p>
                  <p>Based on industry CPC (${industryCPC})</p>
                  <ul className="mt-1 space-y-1">
                    <li className="text-primary">Non-Exclusive Unconfirmed: 25% = ${platformCosts.nonExclusiveUnconfirmed.toFixed(2)}</li>
                    <li className="text-primary">Non-Exclusive Confirmed: 30% = ${platformCosts.nonExclusiveConfirmed.toFixed(2)}</li>
                    <li className="text-primary">Semi-Exclusive: 50% = ${platformCosts.semiExclusive.toFixed(2)}</li>
                    <li className="text-primary">24hr Exclusive: 90% = ${platformCosts.exclusive24h.toFixed(2)}</li>
                  </ul>
                </div>
                <div className="pt-2 border-t">
                  <p className="font-semibold text-foreground">Cost Per Closed Deal:</p>
                  <p>Lead Cost ÷ Lead-to-Award Rate</p>
                  <p className="text-primary">${platformCosts.nonExclusiveUnconfirmed.toFixed(2)} ÷ {(platformConversionRate * 100).toFixed(0)}% = ${platformCostPerDeal.nonExclusiveUnconfirmed.toFixed(0)} (Unconfirmed)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Your Savings with Digsandgigs
          </h4>
          
          {savings.nonExclusiveUnconfirmed > 0 ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-green-500/10">
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Non-Exclusive Unconfirmed</p>
                  <p className="text-xs text-muted-foreground">Lowest cost - shared leads</p>
                </div>
                <div className="text-right">
                  <Badge className="text-lg px-4 py-2 bg-green-600 hover:bg-green-700">
                    ${savings.nonExclusiveUnconfirmed.toFixed(0)} saved
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {savingsPercent.nonExclusiveUnconfirmed.toFixed(0)}% cheaper
                  </p>
                </div>
              </div>

              {savings.nonExclusiveConfirmed > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/5">
                  <div>
                    <p className="font-semibold">Non-Exclusive Confirmed</p>
                    <p className="text-xs text-muted-foreground">Verified leads - shared access</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      ${savings.nonExclusiveConfirmed.toFixed(0)} saved
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {savingsPercent.nonExclusiveConfirmed.toFixed(0)}% cheaper
                    </p>
                  </div>
                </div>
              )}

              {savings.semiExclusive > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/5">
                  <div>
                    <p className="font-semibold">Semi-Exclusive</p>
                    <p className="text-xs text-muted-foreground">Limited to 3 service providers</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="text-lg px-4 py-2">
                      ${savings.semiExclusive.toFixed(0)} saved
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {savingsPercent.semiExclusive.toFixed(0)}% cheaper
                    </p>
                  </div>
                </div>
              )}

              {savings.exclusive24h > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-amber-500/10">
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">24hr Exclusive</p>
                    <p className="text-xs text-muted-foreground">You only - 24 hour head start</p>
                  </div>
                  <div className="text-right">
                    <Badge className="text-lg px-4 py-2 bg-amber-600 hover:bg-amber-700">
                      ${savings.exclusive24h.toFixed(0)} saved
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {savingsPercent.exclusive24h.toFixed(0)}% cheaper
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 rounded-lg border bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground">
                Adjust your conversion rate to see potential savings
              </p>
            </div>
          )}
        </div>

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            * CPC values from real Google Ads data (2024-2025). Conversion rates vary by industry, location, and business factors.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
