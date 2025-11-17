import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Award, Check, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TIERS = {
  free: {
    name: 'Free',
    priceValue: 0,
    leadCostValue: 5,
    commissionValue: 9,
    minimumFee: 0,
    estimateCost: 0,
    hourlyRateClickCost: 0,
  },
  pro: {
    name: 'Pro',
    priceValue: 50,
    leadCostValue: 3,
    commissionValue: 6,
    minimumFee: 0,
    estimateCost: 0,
    hourlyRateClickCost: 0,
  },
  premium: {
    name: 'Premium',
    priceValue: 200,
    leadCostValue: 0,
    commissionValue: 0,
    minimumFee: 0,
    estimateCost: 0,
    hourlyRateClickCost: 0,
  }
};

export default function PlanRecommender() {
  const [leads, setLeads] = useState(15);
  const [jobs, setJobs] = useState(2);
  const [jobValue, setJobValue] = useState(1000);
  const [estimates, setEstimates] = useState(10);
  const [hourlyClicks, setHourlyClicks] = useState(5);
  const [showRecommendation, setShowRecommendation] = useState(false);

  const calculateCosts = (tier: typeof TIERS.free) => {
    const monthlyFee = tier.priceValue;
    const leadCost = tier.leadCostValue * leads;
    const totalJobValue = jobValue * jobs;
    const commission = Math.max((totalJobValue * tier.commissionValue) / 100, tier.minimumFee * jobs);
    const estimateCost = tier.estimateCost * estimates;
    const hourlyClickCost = tier.hourlyRateClickCost * hourlyClicks;
    const totalCost = monthlyFee + leadCost + commission + estimateCost + hourlyClickCost;

    return totalCost;
  };

  const getRecommendation = () => {
    const freeCost = calculateCosts(TIERS.free);
    const proCost = calculateCosts(TIERS.pro);
    const premiumCost = calculateCosts(TIERS.premium);

    const costs = [
      { tier: 'free', name: 'Free', cost: freeCost },
      { tier: 'pro', name: 'Pro', cost: proCost },
      { tier: 'premium', name: 'Premium', cost: premiumCost },
    ];

    const sortedCosts = costs.sort((a, b) => a.cost - b.cost);
    const recommended = sortedCosts[0];
    const savings = costs.find(c => c.tier === 'free')!.cost - recommended.cost;

    return {
      recommended: recommended.tier,
      recommendedName: recommended.name,
      recommendedCost: recommended.cost,
      allCosts: costs,
      savings: savings > 0 ? savings : 0,
    };
  };

  const recommendation = showRecommendation ? getRecommendation() : null;

  const getReasoningForTier = (tier: string) => {
    const totalActivity = leads + estimates + hourlyClicks;
    const totalRevenue = jobValue * jobs;

    if (tier === 'free') {
      return [
        'Your monthly activity level is relatively low',
        'The no monthly fee structure works best for occasional work',
        'Pay-as-you-go model minimizes upfront costs',
      ];
    } else if (tier === 'pro') {
      return [
        'Your moderate activity level benefits from Pro discounts',
        'Lower lead costs and commission rate reduce per-transaction fees',
        `$50/month subscription pays for itself with ${leads} leads`,
        'Best balance of cost and features for your usage pattern',
      ];
    } else {
      return [
        `High activity level (${totalActivity} total monthly clicks) makes Premium worthwhile`,
        'Zero commission saves you significantly on completed jobs',
        'FREE estimates and hourly rate clicks eliminate major cost drivers',
        `Annual savings of $${((calculateCosts(TIERS.free) - calculateCosts(TIERS.premium)) * 12).toFixed(2)} vs Free plan`,
      ];
    }
  };

  const getTierIcon = (tier: string) => {
    if (tier === 'free') return <TrendingUp className="h-8 w-8 text-primary" />;
    if (tier === 'pro') return <Award className="h-8 w-8 text-primary" />;
    return <Award className="h-8 w-8 text-primary" />;
  };

  return (
    <Card className="border-2 border-orange-500">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lightbulb className="h-6 w-6 text-white" />
          <Badge className="bg-white text-orange-600">AI Powered</Badge>
        </div>
        <div className="flex items-center justify-center gap-2">
          <CardTitle className="text-center text-2xl text-white">Plan Recommender</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-white cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-2">How It Works:</p>
                <p className="text-sm">The calculator compares total monthly costs across all three plans based on your inputs: monthly fee + (leads × cost) + (jobs × commission) + (estimates × cost) + (hourly clicks × cost). It then recommends the plan with the lowest total cost for your activity level.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-center text-orange-50">
          Use this calculator to determine which plan is best for your business. Enter your expected monthly activity below to get a personalized recommendation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 bg-white">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-white rounded-lg border border-primary/20">
          <div className="space-y-2">
            <Label htmlFor="rec-leads">Expected Leads/Month</Label>
            <Input
              id="rec-leads"
              type="number"
              min="0"
              value={leads}
              onChange={(e) => setLeads(Number(e.target.value))}
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rec-jobs">Expected Jobs/Month</Label>
            <Input
              id="rec-jobs"
              type="number"
              min="0"
              value={jobs}
              onChange={(e) => setJobs(Number(e.target.value))}
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rec-jobValue">Average Job Value ($)</Label>
            <Input
              id="rec-jobValue"
              type="number"
              min="0"
              step="100"
              value={jobValue}
              onChange={(e) => setJobValue(Number(e.target.value))}
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rec-estimates">Expected Estimate Requests/Month</Label>
            <Input
              id="rec-estimates"
              type="number"
              min="0"
              value={estimates}
              onChange={(e) => setEstimates(Number(e.target.value))}
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rec-hourlyClicks">Expected Hourly Rate Clicks/Month</Label>
            <Input
              id="rec-hourlyClicks"
              type="number"
              min="0"
              value={hourlyClicks}
              onChange={(e) => setHourlyClicks(Number(e.target.value))}
              className="text-lg"
            />
          </div>
        </div>

        <Button 
          size="lg" 
          className="w-full"
          onClick={() => setShowRecommendation(true)}
        >
          <Lightbulb className="mr-2 h-5 w-5" />
          Get Personalized Recommendation
        </Button>

        {recommendation && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* Main Recommendation */}
            <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border-2 border-primary">
              <div className="flex items-start gap-4">
                {getTierIcon(recommendation.recommended)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold">Recommended: {recommendation.recommendedName} Plan</h3>
                    <Badge className="bg-primary">Best Value</Badge>
                  </div>
                  <p className="text-lg text-muted-foreground mb-4">
                    Based on your expected monthly activity, the {recommendation.recommendedName} plan offers the best value at{' '}
                    <span className="font-bold text-primary">${recommendation.recommendedCost.toFixed(2)}/month</span>
                  </p>
                  {recommendation.savings > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-green-700 dark:text-green-300 font-semibold">
                        💰 Save ${recommendation.savings.toFixed(2)}/month (${(recommendation.savings * 12).toFixed(2)}/year) compared to Free plan
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-lg">Why {recommendation.recommendedName}?</h4>
                <ul className="space-y-2">
                  {getReasoningForTier(recommendation.recommended).map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cost Comparison */}
            <div>
              <h4 className="font-semibold text-lg mb-4 text-center">Cost Comparison</h4>
              <div className="grid md:grid-cols-3 gap-4">
                {recommendation.allCosts.map((item) => (
                  <div 
                    key={item.tier} 
                    className={`p-4 rounded-lg border-2 ${
                      item.tier === recommendation.recommended
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{item.name}</span>
                      {item.tier === recommendation.recommended && (
                        <Badge className="bg-primary">Recommended</Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      ${item.cost.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">per month</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Ready to get started with the {recommendation.recommendedName} plan?
              </p>
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent">
                Choose {recommendation.recommendedName} Plan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
