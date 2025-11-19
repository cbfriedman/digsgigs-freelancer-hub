import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, DollarSign, Target } from "lucide-react";

interface IndustryData {
  name: string;
  avgCPC: number;
  clickToLeadRate: number;
  leadToCustomerRate: number;
}

const INDUSTRIES: IndustryData[] = [
  { name: "HVAC Services", avgCPC: 12, clickToLeadRate: 0.08, leadToCustomerRate: 0.15 },
  { name: "Plumbing", avgCPC: 10, clickToLeadRate: 0.10, leadToCustomerRate: 0.20 },
  { name: "Electrical Services", avgCPC: 11, clickToLeadRate: 0.09, leadToCustomerRate: 0.18 },
  { name: "Roofing", avgCPC: 15, clickToLeadRate: 0.06, leadToCustomerRate: 0.12 },
  { name: "Home Remodeling", avgCPC: 13, clickToLeadRate: 0.07, leadToCustomerRate: 0.15 },
  { name: "Pest Control", avgCPC: 9, clickToLeadRate: 0.11, leadToCustomerRate: 0.22 },
];

export const ROIComparisonCalculator = () => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("HVAC Services");
  const [conversionRate, setConversionRate] = useState<string>("25");

  const industry = INDUSTRIES.find(i => i.name === selectedIndustry) || INDUSTRIES[0];
  const platformConversionRate = parseFloat(conversionRate) / 100 || 0.25;

  // Calculate Google AdWords cost per closed deal
  const clicksPerLead = 1 / industry.clickToLeadRate;
  const leadsPerCustomer = 1 / industry.leadToCustomerRate;
  const totalClicks = clicksPerLead * leadsPerCustomer;
  const googleCostPerDeal = totalClicks * industry.avgCPC;

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
    free: googleCostPerDeal - platformCostPerDeal.free,
    pro: googleCostPerDeal - platformCostPerDeal.pro,
    premium: googleCostPerDeal - platformCostPerDeal.premium,
  };

  const savingsPercent = {
    free: (savings.free / googleCostPerDeal) * 100,
    pro: (savings.pro / googleCostPerDeal) * 100,
    premium: (savings.premium / googleCostPerDeal) * 100,
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-accent/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Cost Per Closed Deal: DigsandGigs vs. Google AdWords</CardTitle>
        </div>
        <CardDescription>
          See how much you save using Digsandgigs compared to advertising on Google AdWords
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="industry">Your Industry</Label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.name} value={ind.name}>
                    {ind.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conversion">Your Lead-to-Award Rate (%)</Label>
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
              <h4 className="font-semibold text-sm text-muted-foreground">Google AdWords</h4>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Avg CPC: ${industry.avgCPC}</p>
              <p>Click-to-Lead: {(industry.clickToLeadRate * 100).toFixed(0)}%</p>
              <p>Lead-to-Customer: {(industry.leadToCustomerRate * 100).toFixed(0)}%</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-2xl font-bold text-destructive">
                ${googleCostPerDeal.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">per closed deal</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm text-primary">Digsandgigs Platform</h4>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Click Cost: ${platformCosts.premium.click} (Premium)</p>
              <p>Lead Cost: ${platformCosts.premium.lead} (Premium)</p>
              <p>Lead-to-Award: {(platformConversionRate * 100).toFixed(0)}%</p>
            </div>
            <div className="mt-3 pt-3 border-t border-primary/20">
              <p className="text-2xl font-bold text-primary">
                ${platformCostPerDeal.premium.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">per closed deal</p>
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

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            * Industry averages based on 2024 home services advertising benchmarks. 
            Individual results may vary based on market conditions and campaign optimization.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
