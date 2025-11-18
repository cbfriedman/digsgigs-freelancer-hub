import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";

export const TierSavingsCalculator = () => {
  const [monthlyLeads, setMonthlyLeads] = useState<string>("10");
  const [avgJobValue, setAvgJobValue] = useState<string>("2000");
  const [conversionRate, setConversionRate] = useState<string>("20");

  const leads = parseFloat(monthlyLeads) || 0;
  const jobValue = parseFloat(avgJobValue) || 0;
  const conversion = parseFloat(conversionRate) || 0;
  
  const convertedJobs = leads * (conversion / 100);
  const monthlyRevenue = convertedJobs * jobValue;

  const calculateTierCosts = (tier: 'free' | 'pro' | 'premium') => {
    const leadCosts = { free: 60, pro: 40, premium: 0 };
    const contractAwardFees = { free: 0.10, pro: 0.06, premium: 0.03 }; // Percentage of contract value
    const subscriptions = { free: 0, pro: 99, premium: 599 };

    const leadCost = leads * leadCosts[tier];
    const contractAwardFee = monthlyRevenue * contractAwardFees[tier];
    const escrowFee = convertedJobs * Math.max(10, (jobValue * 0.05)); // 5% with $10 min per job
    const subscription = subscriptions[tier];
    const total = leadCost + contractAwardFee + escrowFee + subscription;

    return { leadCost, contractAwardFee, escrowFee, subscription, total };
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              placeholder="2000"
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conversionRate">Conversion Rate (%)</Label>
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
                      <span className="text-muted-foreground">Lead Costs:</span>
                      <span>${tier.costs.leadCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract Award Fee:</span>
                      <span>${tier.costs.contractAwardFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Escrow Processing Fee:</span>
                      <span>${tier.costs.escrowFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total Cost:</span>
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
