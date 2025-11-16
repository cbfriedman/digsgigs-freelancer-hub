import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const TIERS = {
  free: {
    name: 'Free',
    priceValue: 0,
    leadCostValue: 3,
    commissionValue: 9,
    minimumFee: 5,
    estimateCost: 100,
    hourlyRateClickCost: 100,
    color: '#ef4444',
  },
  pro: {
    name: 'Pro',
    priceValue: 50,
    leadCostValue: 1.5,
    commissionValue: 6,
    minimumFee: 5,
    estimateCost: 100,
    hourlyRateClickCost: 100,
    color: '#f59e0b',
  },
  premium: {
    name: 'Premium',
    priceValue: 600,
    leadCostValue: 0,
    commissionValue: 0,
    minimumFee: 0,
    estimateCost: 0,
    hourlyRateClickCost: 0,
    color: '#10b981',
  }
};

const calculateCosts = (tier: typeof TIERS.free, leads: number, jobs: number, jobValue: number, estimates: number, hourlyClicks: number) => {
  const monthlyFee = tier.priceValue;
  const leadCost = tier.leadCostValue * leads;
  const totalJobValue = jobValue * jobs;
  const commission = Math.max((totalJobValue * tier.commissionValue) / 100, tier.minimumFee * jobs);
  const estimateCost = tier.estimateCost * estimates;
  const hourlyClickCost = tier.hourlyRateClickCost * hourlyClicks;
  const totalCost = monthlyFee + leadCost + commission + estimateCost + hourlyClickCost;

  return totalCost;
};

export default function PricingCharts() {
  // Generate data for cost vs usage chart
  const generateCostVsUsageData = () => {
    const data = [];
    for (let activity = 0; activity <= 50; activity += 5) {
      const leads = activity;
      const estimates = Math.floor(activity * 0.6);
      const hourlyClicks = Math.floor(activity * 0.4);
      const jobs = Math.max(1, Math.floor(activity / 10));
      const jobValue = 1000;

      data.push({
        activity,
        Free: calculateCosts(TIERS.free, leads, jobs, jobValue, estimates, hourlyClicks),
        Pro: calculateCosts(TIERS.pro, leads, jobs, jobValue, estimates, hourlyClicks),
        Premium: calculateCosts(TIERS.premium, leads, jobs, jobValue, estimates, hourlyClicks),
      });
    }
    return data;
  };

  // Generate data for savings comparison
  const generateSavingsData = () => {
    const scenarios = [
      { name: 'Light (10)', leads: 5, jobs: 1, jobValue: 500, estimates: 3, hourlyClicks: 2 },
      { name: 'Moderate (25)', leads: 15, jobs: 2, jobValue: 1000, estimates: 10, hourlyClicks: 5 },
      { name: 'Active (40)', leads: 25, jobs: 3, jobValue: 1500, estimates: 15, hourlyClicks: 10 },
      { name: 'High (60)', leads: 40, jobs: 5, jobValue: 2000, estimates: 25, hourlyClicks: 15 },
    ];

    return scenarios.map(scenario => {
      const freeCost = calculateCosts(TIERS.free, scenario.leads, scenario.jobs, scenario.jobValue, scenario.estimates, scenario.hourlyClicks);
      const proCost = calculateCosts(TIERS.pro, scenario.leads, scenario.jobs, scenario.jobValue, scenario.estimates, scenario.hourlyClicks);
      const premiumCost = calculateCosts(TIERS.premium, scenario.leads, scenario.jobs, scenario.jobValue, scenario.estimates, scenario.hourlyClicks);

      return {
        scenario: scenario.name,
        'Free': freeCost,
        'Pro': proCost,
        'Premium': premiumCost,
        'Pro Savings': freeCost - proCost,
        'Premium Savings': freeCost - premiumCost,
      };
    });
  };

  // Generate annual savings projection data
  const generateAnnualSavingsData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const leads = 20;
    const jobs = 2;
    const jobValue = 1200;
    const estimates = 12;
    const hourlyClicks = 8;

    const freeCost = calculateCosts(TIERS.free, leads, jobs, jobValue, estimates, hourlyClicks);
    const proCost = calculateCosts(TIERS.pro, leads, jobs, jobValue, estimates, hourlyClicks);
    const premiumCost = calculateCosts(TIERS.premium, leads, jobs, jobValue, estimates, hourlyClicks);

    let proSavingsAccumulated = 0;
    let premiumSavingsAccumulated = 0;

    return months.map((month) => {
      proSavingsAccumulated += (freeCost - proCost);
      premiumSavingsAccumulated += (freeCost - premiumCost);

      return {
        month,
        'Pro Savings': Math.max(0, proSavingsAccumulated),
        'Premium Savings': Math.max(0, premiumSavingsAccumulated),
      };
    });
  };

  const costVsUsageData = generateCostVsUsageData();
  const savingsData = generateSavingsData();
  const annualSavingsData = generateAnnualSavingsData();

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <Badge className="bg-gradient-to-r from-primary to-accent">Data Visualization</Badge>
        </div>
        <CardTitle className="text-center text-2xl">Cost Analysis & Savings Trends</CardTitle>
        <CardDescription className="text-center">
          Visual comparison of costs and savings across different usage levels and plans
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cost-vs-usage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cost-vs-usage">Cost vs Usage</TabsTrigger>
            <TabsTrigger value="scenario-comparison">Scenario Comparison</TabsTrigger>
            <TabsTrigger value="annual-savings">Annual Savings</TabsTrigger>
          </TabsList>

          <TabsContent value="cost-vs-usage" className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Total Monthly Cost by Activity Level</h3>
              <p className="text-sm text-muted-foreground">
                See how costs increase with business activity (combined leads, estimates, and hourly clicks)
              </p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={costVsUsageData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="activity" 
                  label={{ value: 'Monthly Activity Level', position: 'insideBottom', offset: -5 }}
                  className="text-xs"
                />
                <YAxis 
                  label={{ value: 'Total Cost ($)', angle: -90, position: 'insideLeft' }}
                  className="text-xs"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Free" 
                  stroke={TIERS.free.color} 
                  strokeWidth={2}
                  dot={{ fill: TIERS.free.color }}
                  name="Free Plan"
                />
                <Line 
                  type="monotone" 
                  dataKey="Pro" 
                  stroke={TIERS.pro.color} 
                  strokeWidth={2}
                  dot={{ fill: TIERS.pro.color }}
                  name="Pro Plan"
                />
                <Line 
                  type="monotone" 
                  dataKey="Premium" 
                  stroke={TIERS.premium.color} 
                  strokeWidth={2}
                  dot={{ fill: TIERS.premium.color }}
                  name="Premium Plan"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIERS.free.color }}></div>
                  <span className="font-semibold">Free Plan</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Costs scale linearly with activity. Best for minimal usage.
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIERS.pro.color }}></div>
                  <span className="font-semibold">Pro Plan</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lower per-transaction costs slow cost growth. Best for moderate activity.
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIERS.premium.color }}></div>
                  <span className="font-semibold">Premium Plan</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fixed cost provides best value at high activity levels.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scenario-comparison" className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Cost Comparison Across Usage Scenarios</h3>
              <p className="text-sm text-muted-foreground">
                Compare total costs for different business activity levels
              </p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="scenario" className="text-xs" />
                <YAxis 
                  label={{ value: 'Monthly Cost ($)', angle: -90, position: 'insideLeft' }}
                  className="text-xs"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="Free" fill={TIERS.free.color} name="Free Plan" />
                <Bar dataKey="Pro" fill={TIERS.pro.color} name="Pro Plan" />
                <Bar dataKey="Premium" fill={TIERS.premium.color} name="Premium Plan" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Key Insights</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• At light usage (10), Free plan is most economical</li>
                <li>• Pro plan becomes better value around moderate usage (25)</li>
                <li>• Premium plan dominates at high activity levels (60+)</li>
                <li>• The crossover point depends on your specific mix of activities</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="annual-savings" className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Accumulated Savings Over 12 Months</h3>
              <p className="text-sm text-muted-foreground">
                Based on moderate activity: 20 leads, 12 estimates, 8 hourly clicks, 2 jobs/month
              </p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={annualSavingsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis 
                  label={{ value: 'Accumulated Savings ($)', angle: -90, position: 'insideLeft' }}
                  className="text-xs"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="Pro Savings" 
                  stackId="1"
                  stroke={TIERS.pro.color} 
                  fill={TIERS.pro.color}
                  fillOpacity={0.6}
                  name="Pro vs Free"
                />
                <Area 
                  type="monotone" 
                  dataKey="Premium Savings" 
                  stackId="2"
                  stroke={TIERS.premium.color} 
                  fill={TIERS.premium.color}
                  fillOpacity={0.6}
                  name="Premium vs Free"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-yellow-800 dark:text-yellow-200">Pro Plan Annual Savings</span>
                  <Badge className="bg-yellow-600">vs Free</Badge>
                </div>
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 mb-1">
                  ${(annualSavingsData[11]['Pro Savings']).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total savings over 12 months compared to Free plan
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-green-800 dark:text-green-200">Premium Plan Annual Savings</span>
                  <Badge className="bg-green-600">vs Free</Badge>
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">
                  ${(annualSavingsData[11]['Premium Savings']).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total savings over 12 months compared to Free plan
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
