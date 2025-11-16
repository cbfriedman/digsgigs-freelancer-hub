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
    jobAwardedCost: 100,
  },
  pro: {
    name: 'Pro',
    priceValue: 50,
    leadCostValue: 5,
    commissionValue: 6,
    minimumFee: 5,
    estimateCost: 50,
    hourlyRateClickCost: 100,
    jobAwardedCost: 100,
  },
  premium: {
    name: 'Premium',
    priceValue: 600,
    leadCostValue: 0,
    commissionValue: 0,
    minimumFee: 0,
    estimateCost: 0,
    hourlyRateClickCost: 0,
    jobAwardedCost: 100,
  }
};

export default function PricingCalculator() {
  const [leads, setLeads] = useState(15);
  const [hourlyRate, setHourlyRate] = useState(100);
  const [conversionRate, setConversionRate] = useState(10);
  const [showResults, setShowResults] = useState(false);
  
  // Free Estimates state
  const [freeEstimateLeads, setFreeEstimateLeads] = useState(15);
  const [freeEstimateConversion, setFreeEstimateConversion] = useState(10);
  const [showFreeEstimateResults, setShowFreeEstimateResults] = useState(false);
  
  const jobs = Math.round(leads * (conversionRate / 100));
  const freeEstimateJobs = Math.round(freeEstimateLeads * (freeEstimateConversion / 100));

  const calculateCosts = (tier: typeof TIERS.free) => {
    const monthlyFee = tier.priceValue;
    const leadCost = tier.leadCostValue * leads;
    const totalJobValue = hourlyRate * jobs;
    const commission = Math.max((totalJobValue * tier.commissionValue) / 100, tier.minimumFee * jobs);
    const totalCost = monthlyFee + leadCost + commission;
    const revenue = totalJobValue;
    const netEarnings = revenue - totalCost;

    return {
      monthlyFee,
      leadCost,
      commission,
      totalCost,
      revenue,
      netEarnings,
    };
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calculator className="h-6 w-6 text-primary" />
          <Badge className="bg-primary">Hourly Bids Calculator</Badge>
        </div>
        <CardTitle className="text-center text-2xl">Cost calculator for hourly bids</CardTitle>
        <CardDescription className="text-center">
          Enter your expected monthly activity to compare costs across plans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-background rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="leads">Leads Purchased/Month</Label>
            <Select 
              value={leads.toString()} 
              onValueChange={(v) => setLeads(Number(v))}
            >
              <SelectTrigger className="text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[300px]">
                {Array.from({ length: 20 }, (_, i) => (i + 1) * 5).map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                {[5, 10, 15, 20, 25].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="jobs">Estimated number of Jobs Awarded (Auto-calculated)</Label>
            <div className="h-10 px-3 py-2 bg-primary/5 rounded-md border border-primary/20 flex items-center gap-2 text-lg font-semibold text-primary">
              <Calculator className="h-4 w-4" />
              {jobs}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
            <Select 
              value={hourlyRate.toString()} 
              onValueChange={(v) => setHourlyRate(Number(v))}
            >
              <SelectTrigger className="text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[300px]">
                {Array.from({ length: 100 }, (_, i) => (i + 1) * 10).map(num => (
                  <SelectItem key={num} value={num.toString()}>${num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {/* Free Estimates Calculator */}
        <div className="mt-8 pt-8 border-t border-border p-6 rounded-lg bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calculator className="h-6 w-6 text-secondary" />
            <Badge className="bg-secondary">Free Estimates Calculator</Badge>
          </div>
          <h3 className="text-center text-2xl font-semibold mb-2">Cost Calculator for Free Estimates</h3>
          <CardDescription className="text-center mb-6">
            Calculate costs for free estimate leads across different plans
          </CardDescription>
          
          <div className="grid md:grid-cols-3 gap-4 p-6 bg-background rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="freeEstimateLeads">Leads Purchased</Label>
              <Select 
                value={freeEstimateLeads.toString()} 
                onValueChange={(v) => setFreeEstimateLeads(Number(v))}
              >
                <SelectTrigger className="text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[300px]">
                  {Array.from({ length: 20 }, (_, i) => (i + 1) * 5).map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeEstimateConversion">Conversion Rate</Label>
              <Select 
                value={freeEstimateConversion.toString()} 
                onValueChange={(v) => setFreeEstimateConversion(Number(v))}
              >
                <SelectTrigger className="text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {[5, 10, 15, 20, 25].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeEstimateJobs">Estimated number of Jobs Awarded (Auto-calculated)</Label>
              <div className="h-10 px-3 py-2 bg-primary/5 rounded-md border border-primary/20 flex items-center gap-2 text-lg font-semibold text-primary">
                <Calculator className="h-4 w-4" />
                {freeEstimateJobs}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button 
              onClick={() => setShowFreeEstimateResults(true)}
              size="lg"
              className="px-8"
            >
              Calculate
            </Button>
          </div>

          {showFreeEstimateResults && (
            <>
            <div className="overflow-x-auto mt-6">
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
                    <td className="py-3 px-4 text-muted-foreground">Cost per Lead</td>
                    {Object.entries(TIERS).map(([key, tier]) => (
                      <td key={key} className="text-right py-3 px-4">
                        {tier.estimateCost === 0 ? (
                          <span className="text-green-600 font-semibold">FREE</span>
                        ) : (
                          `$${tier.estimateCost.toFixed(2)}`
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-muted-foreground">Leads Purchased</td>
                    {Object.entries(TIERS).map(([key]) => (
                      <td key={key} className="text-right py-3 px-4">
                        {freeEstimateLeads}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-muted-foreground">Total Lead Costs</td>
                    {Object.entries(TIERS).map(([key, tier]) => {
                      const totalLeadCost = tier.estimateCost * freeEstimateLeads;
                      return (
                        <td key={key} className="text-right py-3 px-4">
                          {totalLeadCost === 0 ? (
                            <span className="text-green-600 font-semibold">FREE</span>
                          ) : (
                            `$${totalLeadCost.toFixed(2)}`
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-muted-foreground">Estimated number of Jobs Awarded (Auto-calculated)</td>
                    {Object.entries(TIERS).map(([key]) => (
                      <td key={key} className="text-right py-3 px-4">
                        {freeEstimateJobs}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-muted-foreground">Cost per Job Awarded</td>
                    {Object.entries(TIERS).map(([key, tier]) => (
                      <td key={key} className="text-right py-3 px-4">
                        ${tier.jobAwardedCost.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-muted-foreground">Total Job Awarded Costs</td>
                    {Object.entries(TIERS).map(([key, tier]) => {
                      const totalJobCost = tier.jobAwardedCost * freeEstimateJobs;
                      return (
                        <td key={key} className="text-right py-3 px-4">
                          ${totalJobCost.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                  
                  <tr className="border-b-2 border-border bg-primary/5">
                    <td className="py-4 px-4 font-bold text-lg">Total Monthly Costs</td>
                    {Object.entries(TIERS).map(([key, tier]) => {
                      const totalLeadCost = tier.estimateCost * freeEstimateLeads;
                      const totalJobCost = tier.jobAwardedCost * freeEstimateJobs;
                      const totalCost = totalLeadCost + totalJobCost;
                      return (
                        <td key={key} className="text-right py-4 px-4 font-bold text-lg text-primary">
                          ${totalCost.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Savings Comparison */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {Object.entries(TIERS).slice(1).map(([key, tier]) => {
                const freeLeadCost = TIERS.free.estimateCost * freeEstimateLeads;
                const freeJobCost = TIERS.free.jobAwardedCost * freeEstimateJobs;
                const freeTotalCost = freeLeadCost + freeJobCost;
                
                const tierLeadCost = tier.estimateCost * freeEstimateLeads;
                const tierJobCost = tier.jobAwardedCost * freeEstimateJobs;
                const tierTotalCost = tierLeadCost + tierJobCost;
                
                const monthlySavings = freeTotalCost - tierTotalCost;
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
        </div>
      </CardContent>
    </Card>
  );
}
