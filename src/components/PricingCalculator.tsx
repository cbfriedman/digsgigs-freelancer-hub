import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator } from "lucide-react";

const TIERS = {
  free: {
    name: 'Free',
    priceValue: 0,
    leadCostValue: 8,
    commissionValue: 9,
    minimumFee: 5,
    estimateCost: 100,
    hourlyRateClickCost: 100,
  },
  pro: {
    name: 'Pro',
    priceValue: 50,
    leadCostValue: 5,
    commissionValue: 6,
    minimumFee: 5,
    estimateCost: 100,
    hourlyRateClickCost: 100,
  },
  premium: {
    name: 'Premium',
    priceValue: 600,
    leadCostValue: 0,
    commissionValue: 0,
    minimumFee: 0,
    estimateCost: 0,
    hourlyRateClickCost: 0,
  }
};

export default function PricingCalculator() {
  const [leads, setLeads] = useState(15);
  const [jobValue, setJobValue] = useState(1000);
  const [estimates, setEstimates] = useState(10);
  const [hourlyClicks, setHourlyClicks] = useState(5);
  const [conversionRate, setConversionRate] = useState(10);
  const [showResults, setShowResults] = useState(false);
  
  const jobs = Math.floor(leads * (conversionRate / 100));

  const calculateCosts = (tier: typeof TIERS.free) => {
    const monthlyFee = tier.priceValue;
    const leadCost = tier.leadCostValue * leads;
    const totalJobValue = jobValue * jobs;
    const commission = Math.max((totalJobValue * tier.commissionValue) / 100, tier.minimumFee * jobs);
    const estimateCost = tier.estimateCost * estimates;
    const hourlyClickCost = tier.hourlyRateClickCost * hourlyClicks;
    const totalCost = monthlyFee + leadCost + commission + estimateCost + hourlyClickCost;
    const revenue = totalJobValue;
    const netEarnings = revenue - totalCost;

    return {
      monthlyFee,
      leadCost,
      commission,
      estimateCost,
      hourlyClickCost,
      totalCost,
      revenue,
      netEarnings,
    };
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calculator className="h-6 w-6 text-primary" />
          <Badge className="bg-primary">Interactive Tool</Badge>
        </div>
        <CardTitle className="text-center text-2xl">Cost calculator for hourly bids</CardTitle>
        <CardDescription className="text-center">
          Enter your expected monthly activity to compare costs across plans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-background rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="leads">Leads Purchased/Month</Label>
            <Input
              id="leads"
              type="number"
              min="0"
              value={leads}
              onChange={(e) => setLeads(Number(e.target.value))}
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="conversionRate">Conversion Rate</Label>
            <Select 
              value={conversionRate.toString()} 
              onValueChange={(v) => setConversionRate(Number(v))}
            >
              <SelectTrigger className="text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="jobs">Jobs Completed/Month (Auto-calculated)</Label>
            <div className="h-10 px-3 py-2 bg-muted rounded-md border border-input flex items-center text-lg font-semibold">
              {jobs}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="jobValue">Average Job Value ($)</Label>
            <Input
              id="jobValue"
              type="number"
              min="0"
              step="100"
              value={jobValue}
              onChange={(e) => setJobValue(Number(e.target.value))}
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estimates">Free Estimate Requests/Month</Label>
            <Input
              id="estimates"
              type="number"
              min="0"
              value={estimates}
              onChange={(e) => setEstimates(Number(e.target.value))}
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hourlyClicks">Hourly Rate Clicks/Month</Label>
            <Input
              id="hourlyClicks"
              type="number"
              min="0"
              value={hourlyClicks}
              onChange={(e) => setHourlyClicks(Number(e.target.value))}
              className="text-lg"
            />
          </div>
        </div>

        {/* Calculate Button */}
        <div className="flex justify-center">
          <Button 
            onClick={() => setShowResults(true)}
            size="lg"
            className="px-8"
          >
            Calculate
          </Button>
        </div>

        {/* Results Table */}
        {showResults && (
          <>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left py-3 px-4 font-semibold">Cost Component</th>
                {Object.entries(TIERS).map(([key, tier]) => (
                  <th key={key} className="text-right py-3 px-4 font-semibold">{tier.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Monthly Subscription</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      ${costs.monthlyFee.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Lead Purchases</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      ${costs.leadCost.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Commission on Jobs</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      ${costs.commission.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Free Estimate Requests</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      {costs.estimateCost === 0 ? (
                        <span className="text-green-600 font-semibold">FREE</span>
                      ) : (
                        `$${costs.estimateCost.toFixed(2)}`
                      )}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Hourly Rate Clicks</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      {costs.hourlyClickCost === 0 ? (
                        <span className="text-green-600 font-semibold">FREE</span>
                      ) : (
                        `$${costs.hourlyClickCost.toFixed(2)}`
                      )}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Assumed number of conversions to Award</td>
                {Object.entries(TIERS).map(([key, tier]) => (
                  <td key={key} className="text-right py-3 px-4">
                    {Math.floor(leads * (conversionRate / 100))}
                  </td>
                ))}
              </tr>
              
              <tr className="border-b-2 border-border bg-primary/5">
                <td className="py-4 px-4 font-bold text-lg">Total Monthly Costs</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-4 px-4 font-bold text-lg text-primary">
                      ${costs.totalCost.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Total Job Revenue</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      ${costs.revenue.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="bg-green-50 dark:bg-green-950/20">
                <td className="py-4 px-4 font-bold text-lg text-green-700 dark:text-green-400">
                  Net Earnings
                </td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-4 px-4 font-bold text-lg text-green-600">
                      ${costs.netEarnings.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Savings Comparison */}
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(TIERS).slice(1).map(([key, tier]) => {
            const freeCosts = calculateCosts(TIERS.free);
            const tierCosts = calculateCosts(tier);
            const monthlySavings = freeCosts.totalCost - tierCosts.totalCost;
            const annualSavings = monthlySavings * 12;
            
            return (
              <div key={key} className="p-4 border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{tier.name} vs Free</span>
                  <Badge className={monthlySavings > 0 ? 'bg-green-600' : 'bg-red-600'}>
                    {monthlySavings > 0 ? 'Save' : 'Cost'} ${Math.abs(monthlySavings).toFixed(2)}/mo
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Annual {monthlySavings > 0 ? 'Savings' : 'Additional Cost'}: {' '}
                  <span className={`font-bold ${monthlySavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(annualSavings).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}
