import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";

export const TierSavingsCalculator = () => {
  const [monthlyLeads, setMonthlyLeads] = useState<string>("10");
  const [avgJobValue, setAvgJobValue] = useState<string>("5000");
  const [conversionRate, setConversionRate] = useState<string>("20");
  const [clicksToLeads, setClicksToLeads] = useState<string>("25");
  const [awardsToClicks, setAwardsToClicks] = useState<string>("25");

  const leads = parseFloat(monthlyLeads) || 0;
  const jobValue = parseFloat(avgJobValue) || 0;
  const conversion = parseFloat(conversionRate) || 0;
  const clickToLeadRate = parseFloat(clicksToLeads) || 0;
  const awardToClickRate = parseFloat(awardsToClicks) || 0;
  
  const convertedJobs = leads * (conversion / 100);
  const monthlyRevenue = convertedJobs * jobValue;
  
  // Calculate clicks needed based on click-to-lead conversion
  const clicksNeeded = clickToLeadRate > 0 ? leads / (clickToLeadRate / 100) : 0;
  
  // Calculate estimated awards based on award-to-click conversion
  const estimatedAwards = clicksNeeded * (awardToClickRate / 100);
  const estimatedAwardRevenue = estimatedAwards * jobValue;

  const calculateTierCosts = (tier: 'free' | 'pro' | 'premium') => {
    const leadCosts = { free: 20, pro: 10, premium: 5 };
    const clickCosts = { free: 75, pro: 50, premium: 25 };
    const freeEstimateCosts = { free: 150, pro: 100, premium: 50 };
    const contractAwardFees = { free: 0.12, pro: 0.08, premium: 0.03 };
    const subscriptions = { free: 0, pro: 99, premium: 599 };

    const clickCost = clicksNeeded * clickCosts[tier];
    const leadCost = leads * leadCosts[tier];
    const freeEstimateCost = clicksNeeded * freeEstimateCosts[tier];
    const contractAwardFee = estimatedAwardRevenue * contractAwardFees[tier];
    const escrowFee = estimatedAwards * Math.max(10, (jobValue * 0.05));
    const subscription = subscriptions[tier];
    const total = clickCost + leadCost + freeEstimateCost + contractAwardFee + escrowFee + subscription;

    return { clickCost, leadCost, freeEstimateCost, contractAwardFee, escrowFee, subscription, total };
  };

  const freeCosts = calculateTierCosts('free');
  const proCosts = calculateTierCosts('pro');
  const premiumCosts = calculateTierCosts('premium');

  const savingsProVsFree = freeCosts.total - proCosts.total;
  const savingsPremiumVsFree = freeCosts.total - premiumCosts.total;
  const savingsPremiumVsPro = proCosts.total - premiumCosts.total;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-accent/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          <CardTitle>Tier Savings Calculator</CardTitle>
        </div>
        <CardDescription>
          See how much you save by upgrading your subscription tier based on your business volume
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyLeads">Monthly Leads</Label>
            <Input
              id="monthlyLeads"
              type="number"
              min="0"
              value={monthlyLeads}
              onChange={(e) => setMonthlyLeads(e.target.value)}
              placeholder="10"
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avgJobValue">Avg Job Value ($)</Label>
            <Input
              id="avgJobValue"
              type="number"
              min="0"
              value={avgJobValue}
              onChange={(e) => setAvgJobValue(e.target.value)}
              placeholder="5000"
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conversionRate">Lead to Award (%)</Label>
            <Input
              id="conversionRate"
              type="number"
              min="0"
              max="100"
              value={conversionRate}
              onChange={(e) => setConversionRate(e.target.value)}
              placeholder="20"
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clicksToLeads">Assumed Clicks to Leads (%)</Label>
            <Input
              id="clicksToLeads"
              type="number"
              min="0"
              max="100"
              value={clicksToLeads}
              onChange={(e) => setClicksToLeads(e.target.value)}
              placeholder="25"
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awardsToClicks">Assumed Awards to Clicks (%)</Label>
            <Input
              id="awardsToClicks"
              type="number"
              min="0"
              max="100"
              value={awardsToClicks}
              onChange={(e) => setAwardsToClicks(e.target.value)}
              placeholder="25"
              className="text-lg"
            />
          </div>
        </div>

        {leads > 0 && jobValue > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              {[
                { name: 'Free', costs: freeCosts, color: 'text-muted-foreground' },
                { name: 'Pro', costs: proCosts, color: 'text-primary' },
                { name: 'Premium', costs: premiumCosts, color: 'text-accent' },
              ].map((tier) => (
                <div key={tier.name} className="space-y-2 p-4 rounded-lg border bg-card">
                  <h4 className={`font-semibold text-lg ${tier.color}`}>{tier.name}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subscription:</span>
                      <span>${tier.costs.subscription}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Click Costs:</span>
                      <span>${tier.costs.clickCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lead Costs:</span>
                      <span>${tier.costs.leadCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Free Estimate Costs:</span>
                      <span>${tier.costs.freeEstimateCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract Award Fee:</span>
                      <span>${tier.costs.contractAwardFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Escrow Processing Fee:</span>
                      <span>${tier.costs.escrowFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-primary/20">
                      <span>Est. Cost of Award:</span>
                      <span className="text-primary">${((tier.costs.clickCost + tier.costs.leadCost + tier.costs.freeEstimateCost + tier.costs.contractAwardFee) / Math.max(estimatedAwards, 1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total Monthly Cost:</span>
                      <span className={tier.color}>${tier.costs.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Monthly Savings by Upgrading
              </h4>
              
              {savingsProVsFree > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/5">
                  <div>
                    <p className="font-semibold">Free → Pro</p>
                    <p className="text-xs text-muted-foreground">Save by upgrading to Pro</p>
                  </div>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    ${savingsProVsFree.toFixed(2)}/mo
                  </Badge>
                </div>
              )}

              {savingsPremiumVsPro > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/5">
                  <div>
                    <p className="font-semibold">Pro → Premium</p>
                    <p className="text-xs text-muted-foreground">Save by upgrading to Premium</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    ${savingsPremiumVsPro.toFixed(2)}/mo
                  </Badge>
                </div>
              )}

              {savingsPremiumVsFree > 0 && (
                <div className="flex items-center justify-between p-4 rounded-lg border bg-green-500/10">
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">Free → Premium</p>
                    <p className="text-xs text-muted-foreground">Maximum savings potential</p>
                  </div>
                  <Badge className="text-lg px-4 py-2 bg-green-600 hover:bg-green-700">
                    ${savingsPremiumVsFree.toFixed(2)}/mo
                  </Badge>
                </div>
              )}

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Based on {convertedJobs.toFixed(1)} converted jobs per month at {conversion}% conversion rate
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
