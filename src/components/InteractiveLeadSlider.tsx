import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { getLeadCostForIndustry, getAllIndustries } from "@/config/pricing";
import { TrendingDown, DollarSign, Target } from "lucide-react";

export default function InteractiveLeadSlider() {
  const [leadCount, setLeadCount] = useState(25);
  const [selectedIndustry, setSelectedIndustry] = useState('HVAC');
  const industries = getAllIndustries();

  const tier1Cost = getLeadCostForIndustry(selectedIndustry, 'free');
  const tier2Cost = getLeadCostForIndustry(selectedIndustry, 'pro');
  const tier3Cost = getLeadCostForIndustry(selectedIndustry, 'premium');

  // Calculate current tier and cost
  const getCurrentTier = () => {
    if (leadCount <= 10) return { name: 'Standard Rate', cost: tier1Cost, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' };
    if (leadCount <= 50) return { name: 'Volume Discount', cost: tier2Cost, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' };
    return { name: 'Best Bulk Rate', cost: tier3Cost, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' };
  };

  // Calculate total monthly cost
  const calculateTotalCost = () => {
    let total = 0;
    if (leadCount <= 10) {
      total = leadCount * tier1Cost;
    } else if (leadCount <= 50) {
      total = (10 * tier1Cost) + ((leadCount - 10) * tier2Cost);
    } else {
      total = (10 * tier1Cost) + (40 * tier2Cost) + ((leadCount - 50) * tier3Cost);
    }
    return total;
  };

  // Calculate average cost per lead
  const calculateAverageCost = () => {
    return leadCount > 0 ? calculateTotalCost() / leadCount : 0;
  };

  // Calculate savings vs all standard rate
  const calculateSavings = () => {
    const standardCost = leadCount * tier1Cost;
    const actualCost = calculateTotalCost();
    return standardCost - actualCost;
  };

  const currentTier = getCurrentTier();
  const totalCost = calculateTotalCost();
  const avgCost = calculateAverageCost();
  const savings = calculateSavings();
  const savingsPercent = leadCount > 10 ? Math.round((savings / (leadCount * tier1Cost)) * 100) : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Interactive Cost Calculator</CardTitle>
              <CardDescription className="mt-2">
                Slide to see your exact costs at any lead volume
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Industry:</label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Lead Count Display */}
        <div className="text-center space-y-2">
          <div className="text-6xl font-bold text-primary animate-scale-in">
            {leadCount}
          </div>
          <div className="text-sm text-muted-foreground">
            Leads This Month
          </div>
          <div className="text-xs text-muted-foreground italic">
            Currently: <code className="px-2 py-1 bg-background rounded border">JAN#{leadCount}</code>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-4">
          <Slider
            value={[leadCount]}
            onValueChange={(value) => setLeadCount(value[0])}
            max={100}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 lead</span>
            <span>50 leads</span>
            <span>100 leads</span>
          </div>
        </div>

        {/* Current Tier Display */}
        <Card className={`${currentTier.bg} border-2 animate-fade-in`}>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {currentTier.name}
              </Badge>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Current Lead Cost</div>
                <div className={`text-5xl font-bold ${currentTier.color}`}>
                  ${currentTier.cost}
                </div>
                <div className="text-xs text-muted-foreground mt-1">per lead</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-background to-accent/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <DollarSign className="h-8 w-8 mx-auto text-primary" />
                <div className="text-sm text-muted-foreground">Total Monthly Cost</div>
                <div className="text-3xl font-bold text-primary">
                  ${totalCost.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-background to-accent/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <TrendingDown className="h-8 w-8 mx-auto text-green-600" />
                <div className="text-sm text-muted-foreground">Average Per Lead</div>
                <div className="text-3xl font-bold text-green-600">
                  ${avgCost.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-950/10 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Badge className="bg-green-500 text-white text-lg px-3 py-1">
                  {savingsPercent > 0 ? `${savingsPercent}% OFF` : 'No Discount Yet'}
                </Badge>
                <div className="text-sm text-muted-foreground">Your Savings</div>
                <div className="text-3xl font-bold text-green-600">
                  ${savings > 0 ? savings.toLocaleString() : '0'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <Card className="bg-accent/20 border-accent">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Breakdown for {leadCount} Leads
            </h3>
            <div className="space-y-3 text-sm">
              {leadCount >= 1 && (
                <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <span>Lead #1-{Math.min(leadCount, 10)} @ ${tier1Cost} each</span>
                  <span className="font-semibold">${Math.min(leadCount, 10) * tier1Cost}</span>
                </div>
              )}
              {leadCount > 10 && (
                <div className="flex justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded">
                  <span>Lead #11-{Math.min(leadCount, 50)} @ ${tier2Cost} each</span>
                  <span className="font-semibold">${(Math.min(leadCount, 50) - 10) * tier2Cost}</span>
                </div>
              )}
              {leadCount > 50 && (
                <div className="flex justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded">
                  <span>Lead #51-{leadCount} @ ${tier3Cost} each</span>
                  <span className="font-semibold">${(leadCount - 50) * tier3Cost}</span>
                </div>
              )}
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between p-3 bg-primary/10 rounded font-bold text-lg">
                <span>Total</span>
                <span>${totalCost.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestone Alerts */}
        {leadCount === 10 && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-500 text-white">🎯 Next Milestone</Badge>
              <span className="text-sm">One more lead gets you to the <strong>Volume Discount</strong> tier!</span>
            </div>
          </div>
        )}
        {leadCount === 50 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg animate-fade-in">
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-500 text-white">🎯 Next Milestone</Badge>
              <span className="text-sm">One more lead unlocks the <strong>Best Bulk Rate</strong>!</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
