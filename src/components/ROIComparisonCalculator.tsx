import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, DollarSign, Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompetitorPlatform {
  name: string;
  costModel: "cpc" | "cpl" | "percentage" | "subscription";
  avgCost: number; // CPC, CPL, or percentage
  clickToLeadRate?: number; // for CPC models
  description: string;
}

interface IndustryData {
  name: string;
  avgCPC: number;
  clickToLeadRate: number;
  leadToCustomerRate: number;
}

interface IndustryCategory {
  category: string;
  industries: IndustryData[];
}

interface CompetitorPlatform {
  name: string;
  costModel: "cpc" | "cpl" | "percentage" | "subscription";
  avgCost: number; // CPC, CPL, or percentage
  clickToLeadRate?: number; // for CPC models
  description: string;
}

const COMPETITOR_PLATFORMS: CompetitorPlatform[] = [
  {
    name: "Google AdWords",
    costModel: "cpc",
    avgCost: 16, // will be overridden by industry-specific data
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
    name: "TaskRabbit",
    costModel: "percentage",
    avgCost: 20,
    description: "20% commission on completed jobs"
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
    name: "Mortgage Lead Platforms",
    costModel: "cpl",
    avgCost: 75,
    description: "Average cost per qualified mortgage lead"
  },
  {
    name: "Insurance Lead Platforms",
    costModel: "cpl",
    avgCost: 85,
    description: "Average cost per qualified insurance lead"
  }
];

const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  {
    category: "Construction & Trades",
    industries: [
      { name: "Construction", avgCPC: 16, clickToLeadRate: 0.07, leadToCustomerRate: 0.14 },
      { name: "Automotive Services", avgCPC: 9, clickToLeadRate: 0.11, leadToCustomerRate: 0.23 },
    ]
  },
  {
    category: "Professional Services",
    industries: [
      { name: "Architects", avgCPC: 20, clickToLeadRate: 0.05, leadToCustomerRate: 0.10 },
      { name: "Engineers", avgCPC: 17, clickToLeadRate: 0.06, leadToCustomerRate: 0.12 },
      { name: "Legal Services", avgCPC: 35, clickToLeadRate: 0.04, leadToCustomerRate: 0.08 },
      { name: "Financial Services", avgCPC: 23, clickToLeadRate: 0.05, leadToCustomerRate: 0.10 },
      { name: "Design Services", avgCPC: 14, clickToLeadRate: 0.08, leadToCustomerRate: 0.16 },
    ]
  },
  {
    category: "Health & Wellness",
    industries: [
      { name: "Therapists and Counseling", avgCPC: 12, clickToLeadRate: 0.08, leadToCustomerRate: 0.17 },
      { name: "Fitness and Nutrition", avgCPC: 8, clickToLeadRate: 0.13, leadToCustomerRate: 0.30 },
    ]
  },
  {
    category: "Education & Events",
    industries: [
      { name: "Education and Tutoring", avgCPC: 11, clickToLeadRate: 0.11, leadToCustomerRate: 0.22 },
      { name: "Event Planning", avgCPC: 13, clickToLeadRate: 0.09, leadToCustomerRate: 0.20 },
    ]
  },
  {
    category: "Technology & Creative",
    industries: [
      { name: "Hi Tech and Digital Media", avgCPC: 17, clickToLeadRate: 0.07, leadToCustomerRate: 0.14 },
    ]
  },
  {
    category: "Other Services",
    industries: [
      { name: "Pet Services", avgCPC: 9, clickToLeadRate: 0.12, leadToCustomerRate: 0.25 },
    ]
  }
];

// Flatten for easy lookup
const ALL_INDUSTRIES = INDUSTRY_CATEGORIES.flatMap(cat => cat.industries);

export const ROIComparisonCalculator = () => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("Construction");
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("Google AdWords");
  const [conversionRate, setConversionRate] = useState<string>("25");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const industry = ALL_INDUSTRIES.find(i => i.name === selectedIndustry) || ALL_INDUSTRIES[0];
  const competitor = COMPETITOR_PLATFORMS.find(c => c.name === selectedCompetitor) || COMPETITOR_PLATFORMS[0];
  const platformConversionRate = parseFloat(conversionRate) / 100 || 0.25;

  // Update conversion rate to match industry's lead-to-customer rate
  useEffect(() => {
    setConversionRate((industry.leadToCustomerRate * 100).toFixed(0));
  }, [industry]);

  // Filter categories based on search term
  const filteredCategories = INDUSTRY_CATEGORIES.map(category => ({
    ...category,
    industries: category.industries.filter(ind =>
      ind.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.industries.length > 0);

  // Calculate competitor cost per closed deal based on their model
  let competitorCostPerLead: number;
  let competitorCostPerDeal: number;
  
  if (competitor.costModel === "cpc") {
    // For CPC models like Google AdWords
    const clicksPerLead = 1 / industry.clickToLeadRate;
    const leadsPerCustomer = 1 / industry.leadToCustomerRate;
    const totalClicks = clicksPerLead * leadsPerCustomer;
    competitorCostPerDeal = totalClicks * industry.avgCPC;
    competitorCostPerLead = industry.avgCPC / industry.clickToLeadRate;
  } else if (competitor.costModel === "cpl") {
    // For CPL models (most competitors)
    competitorCostPerLead = competitor.avgCost;
    competitorCostPerDeal = competitorCostPerLead / industry.leadToCustomerRate;
  } else if (competitor.costModel === "percentage") {
    // For percentage-based models like TaskRabbit
    // Assuming average job value needs to be calculated differently
    // Using a typical job value range for service industries
    const avgJobValue = 1000; // placeholder - would vary by industry
    competitorCostPerLead = avgJobValue * (competitor.avgCost / 100);
    competitorCostPerDeal = competitorCostPerLead / industry.leadToCustomerRate;
  } else {
    // subscription model - simplified
    competitorCostPerLead = competitor.avgCost;
    competitorCostPerDeal = competitorCostPerLead / industry.leadToCustomerRate;
  }

  // Calculate platform costs per closed deal
  const platformCosts = {
    free: { click: 125, lead: 20, total: 145 },
    pro: { click: 100, lead: 10, total: 110 },
    premium: { click: 75, lead: 5, total: 80 },
  };

  const platformCostPerDeal = {
    free: platformCosts.free.total / platformConversionRate,
    pro: platformCosts.pro.total / platformConversionRate,
    premium: platformCosts.premium.total / platformConversionRate,
  };

  const savings = {
    free: competitorCostPerDeal - platformCostPerDeal.free,
    pro: competitorCostPerDeal - platformCostPerDeal.pro,
    premium: competitorCostPerDeal - platformCostPerDeal.premium,
  };

  const savingsPercent = {
    free: (savings.free / competitorCostPerDeal) * 100,
    pro: (savings.pro / competitorCostPerDeal) * 100,
    premium: (savings.premium / competitorCostPerDeal) * 100,
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
                      <strong>Lead-to-Award Rate:</strong> The percentage of contacted leads that become paying customers. For example, 25% means 1 out of every 4 leads converts to a sale.
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
              <SelectContent>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <SelectGroup key={category.category}>
                      <SelectLabel>{category.category}</SelectLabel>
                      {category.industries.map((ind) => (
                        <SelectItem key={ind.name} value={ind.name}>
                          {ind.name}
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
                      Industry average ranges from 15-30% depending on your service, pricing, and follow-up process.
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
              placeholder="25"
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
                  <p>Avg CPC: ${industry.avgCPC}</p>
                  <p>Click-to-Lead: {(industry.clickToLeadRate * 100).toFixed(0)}%</p>
                  <p className="font-semibold text-foreground">True Cost Per Lead: ${competitorCostPerLead.toFixed(0)}</p>
                </>
              ) : competitor.costModel === "cpl" ? (
                <>
                  <p>Cost Per Lead: ${competitor.avgCost}</p>
                </>
              ) : competitor.costModel === "percentage" ? (
                <>
                  <p>Commission: {competitor.avgCost}%</p>
                  <p className="font-semibold text-foreground">Effective Cost Per Lead: ${competitorCostPerLead.toFixed(0)}</p>
                </>
              ) : (
                <p>Subscription: ${competitor.avgCost}/mo</p>
              )}
              <p>Lead-to-Customer: {(industry.leadToCustomerRate * 100).toFixed(0)}%</p>
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
                <p className="text-xs text-muted-foreground mb-1">Premium Tier</p>
                <p className="text-2xl font-bold text-primary">
                  ${platformCostPerDeal.premium.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">per closed deal</p>
              </div>
              <div className="pt-2 border-t border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Pro Tier</p>
                <p className="text-xl font-bold text-foreground">
                  ${platformCostPerDeal.pro.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">per closed deal</p>
              </div>
              <div className="pt-2 border-t border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Free Tier</p>
                <p className="text-lg font-semibold text-foreground">
                  ${platformCostPerDeal.free.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">per closed deal</p>
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
                      <p className="text-primary">${industry.avgCPC} ÷ {(industry.clickToLeadRate * 100).toFixed(0)}% = ${competitorCostPerLead.toFixed(0)}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-foreground">Cost Per Closed Deal:</p>
                      <p>True Cost Per Lead ÷ Lead-to-Customer Rate</p>
                      <p className="text-destructive">${competitorCostPerLead.toFixed(0)} ÷ {(industry.leadToCustomerRate * 100).toFixed(0)}% = ${competitorCostPerDeal.toFixed(0)}</p>
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
                      <p className="text-destructive">${competitorCostPerLead.toFixed(0)} ÷ {(industry.leadToCustomerRate * 100).toFixed(0)}% = ${competitorCostPerDeal.toFixed(0)}</p>
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
                      <p className="text-destructive">${competitorCostPerLead.toFixed(0)} ÷ {(industry.leadToCustomerRate * 100).toFixed(0)}% = ${competitorCostPerDeal.toFixed(0)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-primary/5">
              <h5 className="font-semibold text-sm mb-2">Digsandgigs Platform Calculation</h5>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground">True Cost Per Lead (Premium):</p>
                  <p>Click Cost + Lead Cost</p>
                  <p className="text-primary">${platformCosts.premium.click} + ${platformCosts.premium.lead} = ${platformCosts.premium.total}</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="font-semibold text-foreground">Cost Per Closed Deal (Premium):</p>
                  <p>True Cost Per Lead ÷ Lead-to-Award Rate</p>
                  <p className="text-primary">${platformCosts.premium.total} ÷ {(platformConversionRate * 100).toFixed(0)}% = ${platformCostPerDeal.premium.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Your Savings with Digsandgigs
          </h4>
          
          {savings.premium > 0 ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-green-500/10">
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Premium Plan</p>
                  <p className="text-xs text-muted-foreground">Best value - highest savings</p>
                </div>
                <div className="text-right">
                  <Badge className="text-lg px-4 py-2 bg-green-600 hover:bg-green-700">
                    ${savings.premium.toFixed(0)} saved
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {savingsPercent.premium.toFixed(0)}% cheaper
                  </p>
                </div>
              </div>

              {savings.pro > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/5">
                  <div>
                    <p className="font-semibold">Pro Plan</p>
                    <p className="text-xs text-muted-foreground">Great savings for growing businesses</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      ${savings.pro.toFixed(0)} saved
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {savingsPercent.pro.toFixed(0)}% cheaper
                    </p>
                  </div>
                </div>
              )}

              {savings.free > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/5">
                  <div>
                    <p className="font-semibold">Free Plan</p>
                    <p className="text-xs text-muted-foreground">Still cheaper than AdWords</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="text-lg px-4 py-2">
                      ${savings.free.toFixed(0)} saved
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {savingsPercent.free.toFixed(0)}% cheaper
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
            * All cost values and conversion rates are industry averages and may vary significantly based on location, competition, seasonality, and individual business factors. 
            Competitor costs based on 2024 industry benchmarks. Individual results may vary based on market conditions and campaign optimization.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
