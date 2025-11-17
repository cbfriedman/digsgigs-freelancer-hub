import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TIERS = {
  free: {
    name: 'Free',
    priceValue: 0,
    leadCostValue: 5,
    commissionValue: 9,
    minimumFee: 0,
    estimateCost: 100,
    hourlyRateClickCost: 0,
    jobAwardedCost: 100,
    hoursPerAward: 3,
  },
  pro: {
    name: 'Pro',
    priceValue: 50,
    leadCostValue: 3,
    commissionValue: 6,
    minimumFee: 0,
    estimateCost: 100,
    hourlyRateClickCost: 0,
    jobAwardedCost: 100,
    hoursPerAward: 2,
  },
  premium: {
    name: 'Premium',
    priceValue: 600,
    leadCostValue: 0,
    commissionValue: 0,
    minimumFee: 0,
    estimateCost: 0,
    hourlyRateClickCost: 0,
    jobAwardedCost: 0,
    hoursPerAward: 0.5,
  }
};

export default function PricingCalculator() {
  const [leads, setLeads] = useState(30);
  const [hourlyRate, setHourlyRate] = useState(100);
  const [hoursPerJob, setHoursPerJob] = useState(10);
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
    
    // For hourly bids: upfront lead cost + hourly charge when awarded
    // Free: 3 hours, Pro: 2 hours, Premium: 1 hour
    const hoursCharged = tier.hoursPerAward ?? 1;
    const upfrontLeadCost = tier.leadCostValue * leads;
    const costPerAwardIndividual = hourlyRate * hoursCharged;
    const costPerAward = costPerAwardIndividual * jobs;
    
    // No commission on hourly bids
    const totalCost = monthlyFee + upfrontLeadCost + costPerAward;
    const totalJobValue = hourlyRate * hoursPerJob * jobs;
    const revenue = totalJobValue;
    const netEarnings = revenue - totalCost;

    return {
      monthlyFee,
      upfrontLeadCost,
      costPerAwardIndividual,
      costPerAward,
      totalCost,
      revenue,
      netEarnings,
    };
  };

  return (
    <Card className="border-2 border-blue-500">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calculator className="h-6 w-6 text-white" />
          <Badge className="bg-white text-blue-600">Hourly Bids Calculator</Badge>
        </div>
        <CardTitle className="text-center text-2xl text-white">Cost calculator for hourly bids</CardTitle>
        <CardDescription className="text-center text-blue-50">
          Enter your expected monthly activity to compare costs across plans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 bg-white">
        {/* Input Fields */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 p-6 bg-white rounded-lg border">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="leads">Leads Purchased/Month</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">A lead is when a consumer clicks to view your contact information. Free: $8/lead, Pro: $5/lead, Premium: FREE</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
            <div className="flex items-center gap-2">
              <Label htmlFor="conversionRate">Conversion Rate</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">The percentage of leads that convert into awarded jobs. Industry average is typically 10-15%.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={conversionRate.toString()} 
              onValueChange={(v) => setConversionRate(Number(v))}
            >
              <SelectTrigger className="text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {[10, 15, 20, 25].map(num => (
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
            <div className="flex items-center gap-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Your hourly rate that you charge clients</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="hoursPerJob">Average Hours per Job</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">Average number of hours you work on each job. Commission is calculated on total revenue: hourly rate × hours × jobs</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select 
              value={hoursPerJob.toString()}
              onValueChange={(value) => setHoursPerJob(Number(value))}
            >
              <SelectTrigger id="hoursPerJob" className="text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {[5, 10, 15, 20, 25, 30, 35, 40].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num} hours</SelectItem>
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
          <table className="w-full text-sm border-l-4 border-l-blue-500">
            <thead>
              <tr className="border-b-2 border-border bg-blue-50">
                <th className="text-left py-3 px-4 font-semibold">Estimated P&L</th>
                {Object.entries(TIERS).map(([key, tier]) => (
                  <th key={key} className="text-right py-3 px-4 font-semibold">{tier.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-border bg-green-50 dark:bg-green-950/20">
                <td className="py-4 px-4 font-bold text-lg text-green-700 dark:text-green-400">
                  Estimated Revenues
                </td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-4 px-4 font-bold text-lg text-green-600">
                      ${costs.revenue.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
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
                <td className="py-3 px-4 text-muted-foreground">Total cost of leads purchased</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      ${costs.upfrontLeadCost.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    Cost per Award
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Hourly charge on awarded leads: Free (3 hrs), Pro (2 hrs), Premium (1 hr)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  const hoursCharged = (tier as any).hoursPerAward ?? 1;
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      ${costs.costPerAwardIndividual.toFixed(2)}
                      <div className="text-xs text-muted-foreground">
                        ({hoursCharged} {hoursCharged === 1 ? 'hr' : 'hrs'} × ${hourlyRate})
                      </div>
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Total Award Cost per Transaction</td>
                {Object.entries(TIERS).map(([key, tier]) => {
                  const costs = calculateCosts(tier);
                  return (
                    <td key={key} className="text-right py-3 px-4">
                      ${costs.costPerAward.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
              
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-muted-foreground">Number of Transactions per Month</td>
                {Object.entries(TIERS).map(([key]) => (
                  <td key={key} className="text-right py-3 px-4">
                    {jobs}
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
              
              <tr className="bg-green-50 dark:bg-green-950/20 border-t-2 border-border">
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
        <div className="mt-8 pt-0 border-2 border-purple-500 rounded-lg">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calculator className="h-6 w-6 text-white" />
              <Badge className="bg-white text-purple-600">Free Estimates Calculator</Badge>
            </div>
            <h3 className="text-center text-2xl font-semibold mb-2 text-white">Cost Calculator for Free Estimates</h3>
            <p className="text-center text-purple-50">
              Calculate costs for free estimate leads across different plans
            </p>
          </div>
          
          <div className="p-6 bg-white">
          <div className="grid md:grid-cols-3 gap-4 p-6 bg-white rounded-lg border">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="freeEstimateLeads">Leads Purchased</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">When you offer free estimates, consumers can request one directly. Free & Pro: $100/request, Premium: FREE</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
              <div className="flex items-center gap-2">
                <Label htmlFor="freeEstimateConversion">Conversion Rate</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">The percentage of free estimate requests that convert into awarded jobs. Typically higher than standard leads since consumers are more committed.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
              <table className="w-full text-sm border-l-4 border-l-purple-500">
                <thead>
                  <tr className="border-b-2 border-border bg-purple-50">
                    <th className="text-left py-3 px-4 font-semibold">Cost Component</th>
                    {Object.entries(TIERS).map(([key, tier]) => (
                      <th key={key} className="text-right py-3 px-4 font-semibold">{tier.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-muted-foreground">Upfront Estimate Request Cost</td>
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
                    <td className="py-3 px-4 text-muted-foreground">Total Upfront Costs</td>
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
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        Cost per Award
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cost charged when a job is awarded</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                    {Object.entries(TIERS).map(([key, tier]) => (
                      <td key={key} className="text-right py-3 px-4">
                        {tier.jobAwardedCost === 0 ? (
                          <span className="text-green-600 font-semibold">FREE</span>
                        ) : (
                          `$${tier.jobAwardedCost.toFixed(2)}`
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-muted-foreground">Total Award Costs</td>
                    {Object.entries(TIERS).map(([key, tier]) => {
                      const totalJobCost = tier.jobAwardedCost * freeEstimateJobs;
                      return (
                        <td key={key} className="text-right py-3 px-4">
                          {totalJobCost === 0 ? (
                            <span className="text-green-600 font-semibold">FREE</span>
                          ) : (
                            `$${totalJobCost.toFixed(2)}`
                          )}
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
        </div>
      </CardContent>
    </Card>
  );
}
