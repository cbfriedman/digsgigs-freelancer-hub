import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

const BreakevenCalculator = () => {
  const [leads, setLeads] = useState(20);
  const [jobs, setJobs] = useState(3);
  const [avgJobValue, setAvgJobValue] = useState(2000);
  const [estimates, setEstimates] = useState(10);
  const [hourlyRateClicks, setHourlyRateClicks] = useState(5);
  const [hourlyRate, setHourlyRate] = useState(100);

  // Pro Plan Calculations
  const proSubscription = 99;
  const proLeadCost = leads * 40; // $40 per lead
  const proEstimateCost = estimates * 100; // $100 per estimate
  const proRevenue = jobs * avgJobValue;
  const proContractAwardFee = proRevenue * 0.06; // 6% of contract value
  const proEscrowFee = jobs * Math.max(10, avgJobValue * 0.05); // 5% with $10 min per job
  const proHourlyAwardUpcharge = hourlyRateClicks * (hourlyRate * 2); // 2x avg rate
  const proTotalCosts = proSubscription + proLeadCost + proEstimateCost + proContractAwardFee + proEscrowFee + proHourlyAwardUpcharge;
  const proNetEarnings = proRevenue - proTotalCosts;

  // Premium Plan Calculations
  const premiumSubscription = 599;
  const premiumLeadCost = 0; // $0 per lead
  const premiumEstimateCost = estimates * 50; // $50 per estimate
  const premiumRevenue = jobs * avgJobValue;
  const premiumContractAwardFee = premiumRevenue * 0.03; // 3% of contract value
  const premiumEscrowFee = jobs * Math.max(10, avgJobValue * 0.05); // 5% with $10 min per job
  const premiumHourlyAwardUpcharge = hourlyRateClicks * (hourlyRate * 1); // 1x avg rate
  const premiumTotalCosts = premiumSubscription + premiumEstimateCost + premiumContractAwardFee + premiumEscrowFee + premiumHourlyAwardUpcharge;
  const premiumNetEarnings = premiumRevenue - premiumTotalCosts;

  // Breakeven Analysis
  const earningsDifference = premiumNetEarnings - proNetEarnings;
  const percentageDifference = proNetEarnings > 0 
    ? ((earningsDifference / proNetEarnings) * 100) 
    : 0;
  
  const isPremiumBetter = percentageDifference >= 10;
  const isClose = percentageDifference >= 0 && percentageDifference < 10;

  const getStatusIcon = () => {
    if (isPremiumBetter) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (isClose) return <Minus className="w-5 h-5 text-yellow-500" />;
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (isPremiumBetter) {
      return (
        <Badge className="bg-green-500 text-white">
          Premium is {percentageDifference.toFixed(1)}% More Profitable!
        </Badge>
      );
    }
    if (isClose) {
      return (
        <Badge className="bg-yellow-500 text-white">
          Premium is {percentageDifference.toFixed(1)}% Better (Close to 10% Threshold)
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500 text-white">
        Pro is More Profitable (Premium is {Math.abs(percentageDifference).toFixed(1)}% Worse)
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Premium 10% Breakeven Calculator</CardTitle>
            <CardDescription>
              Adjust your monthly activity to see when Premium becomes 10%+ more profitable than Pro
            </CardDescription>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Status Banner */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-center gap-2 mb-2">
            {getStatusBadge()}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Pro Net Earnings</p>
              <p className="text-lg font-bold text-blue-600">
                ${proNetEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Premium Net Earnings</p>
              <p className="text-lg font-bold text-purple-600">
                ${premiumNetEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Difference</p>
              <p className={`text-lg font-bold ${earningsDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {earningsDifference >= 0 ? '+' : ''}${earningsDifference.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
          {/* Number of Leads */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Number of Leads per Month</Label>
              <span className="text-sm font-semibold">{leads} leads</span>
            </div>
            <Slider
              value={[leads]}
              onValueChange={(value) => setLeads(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Number of Jobs */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Number of Completed Jobs per Month</Label>
              <span className="text-sm font-semibold">{jobs} jobs</span>
            </div>
            <Slider
              value={[jobs]}
              onValueChange={(value) => setJobs(value[0])}
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>10</span>
              <span>20</span>
            </div>
          </div>

          {/* Average Job Value */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Average Job Value</Label>
              <span className="text-sm font-semibold">${avgJobValue.toLocaleString()}</span>
            </div>
            <Slider
              value={[avgJobValue]}
              onValueChange={(value) => setAvgJobValue(value[0])}
              min={500}
              max={10000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$500</span>
              <span>$5,000</span>
              <span>$10,000</span>
            </div>
          </div>

          {/* Estimate Requests */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Free Estimate Requests per Month</Label>
              <span className="text-sm font-semibold">{estimates} requests</span>
            </div>
            <Slider
              value={[estimates]}
              onValueChange={(value) => setEstimates(value[0])}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>

          {/* Hourly Rate Clicks */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Hourly Rate Clicks (Awarded) per Month</Label>
              <span className="text-sm font-semibold">{hourlyRateClicks} clicks</span>
            </div>
            <Slider
              value={[hourlyRateClicks]}
              onValueChange={(value) => setHourlyRateClicks(value[0])}
              min={0}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Your Hourly Rate</Label>
              <span className="text-sm font-semibold">${hourlyRate}/hour</span>
            </div>
            <Slider
              value={[hourlyRate]}
              onValueChange={(value) => setHourlyRate(value[0])}
              min={50}
              max={500}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$50</span>
              <span>$250</span>
              <span>$500</span>
            </div>
          </div>
        </div>

        {/* Detailed Cost Breakdown */}
        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
          {/* Pro Plan Breakdown */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-600 mb-3">Pro Plan Breakdown</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Subscription</span>
                <span>${proSubscription.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Costs ({leads} × $1.50)</span>
                <span>${proLeadCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimate Costs ({estimates} × $100)</span>
                <span>${proEstimateCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract Award Fee (6%)</span>
                <span>${proContractAwardFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Escrow Processing Fee (5%, min $10/job)</span>
                <span>${proEscrowFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hourly Award Upcharge ({hourlyRateClicks} × 2x rate)</span>
                <span>${proHourlyAwardUpcharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span>Total Costs</span>
                <span>${proTotalCosts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-blue-600">
                <span>Net Earnings</span>
                <span>${proNetEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Premium Plan Breakdown */}
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-600 mb-3">Premium Plan Breakdown</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Subscription</span>
                <span>${premiumSubscription.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Costs ({leads} leads)</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimate Costs ({estimates} requests)</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hourly Click Costs ({hourlyRateClicks} clicks)</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract Award Fee (3%)</span>
                <span>${premiumContractAwardFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Escrow Processing Fee (5%, min $10/job)</span>
                <span>${premiumEscrowFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hourly Award Upcharge ({hourlyRateClicks} × 1x rate)</span>
                <span>${premiumHourlyAwardUpcharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span>Total Costs</span>
                <span>${premiumTotalCosts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-purple-600">
                <span>Net Earnings</span>
                <span>${premiumNetEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Insight Banner */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-primary mb-1">💡 Key Insight</p>
            {isPremiumBetter ? (
              <p className="text-muted-foreground">
                At your current activity level, Premium plan gives you <strong className="text-primary">{percentageDifference.toFixed(1)}% more net earnings</strong> than Pro! 
                You're saving ${Math.abs(earningsDifference).toFixed(2)}/month by being on Premium.
              </p>
            ) : isClose ? (
              <p className="text-muted-foreground">
                You're close to the breakeven point! Increase your job volume or estimate requests by about 20-30% to reach the 10% threshold where Premium becomes clearly more profitable.
              </p>
            ) : (
              <p className="text-muted-foreground">
                At your current activity level, Pro plan is more cost-effective. Consider Premium when you're consistently completing ${Math.ceil((premiumSubscription - proSubscription + proTotalCosts * 1.1 - premiumTotalCosts) / (jobs || 1) / avgJobValue * jobs * avgJobValue / 1000) * 1000}+ in monthly revenue with high estimate/lead volume.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BreakevenCalculator;
