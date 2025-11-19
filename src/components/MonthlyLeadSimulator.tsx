import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { getLeadCostForIndustry, getAllIndustries } from "@/config/pricing";
import { Calendar, TrendingUp, Calculator, Sparkles } from "lucide-react";

export default function MonthlyLeadSimulator() {
  const [leadsPerWeek, setLeadsPerWeek] = useState(6);
  const [selectedIndustry, setSelectedIndustry] = useState('HVAC');
  const industries = getAllIndustries();

  const tier1Cost = getLeadCostForIndustry(selectedIndustry, 'free');
  const tier2Cost = getLeadCostForIndustry(selectedIndustry, 'pro');
  const tier3Cost = getLeadCostForIndustry(selectedIndustry, 'premium');

  // Calculate monthly projection (4.33 weeks average)
  const monthlyLeads = Math.round(leadsPerWeek * 4.33);

  const calculateProjectedCost = () => {
    let total = 0;
    if (monthlyLeads <= 10) {
      total = monthlyLeads * tier1Cost;
    } else if (monthlyLeads <= 50) {
      total = (10 * tier1Cost) + ((monthlyLeads - 10) * tier2Cost);
    } else {
      total = (10 * tier1Cost) + (40 * tier2Cost) + ((monthlyLeads - 50) * tier3Cost);
    }
    return total;
  };

  const projectedCost = calculateProjectedCost();
  const avgCostPerLead = monthlyLeads > 0 ? projectedCost / monthlyLeads : 0;

  // Weekly breakdown
  const weeks = [1, 2, 3, 4].map(week => {
    const leadsUpToThisWeek = Math.min(leadsPerWeek * week, monthlyLeads);
    let cost = 0;
    if (leadsUpToThisWeek <= 10) {
      cost = leadsUpToThisWeek * tier1Cost;
    } else if (leadsUpToThisWeek <= 50) {
      cost = (10 * tier1Cost) + ((leadsUpToThisWeek - 10) * tier2Cost);
    } else {
      cost = (10 * tier1Cost) + (40 * tier2Cost) + ((leadsUpToThisWeek - 50) * tier3Cost);
    }
    return {
      week,
      totalLeads: leadsUpToThisWeek,
      totalCost: cost
    };
  });

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Monthly Lead & Cost Simulator</CardTitle>
              <CardDescription className="mt-2">
                Project your monthly costs based on weekly lead volume
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Industry:</Label>
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
        {/* Input Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="leadsPerWeek">Expected Leads Per Week</Label>
            <div className="flex gap-2">
              <Input
                id="leadsPerWeek"
                type="number"
                min="0"
                max="50"
                value={leadsPerWeek}
                onChange={(e) => setLeadsPerWeek(Math.max(0, parseInt(e.target.value) || 0))}
                className="text-lg"
              />
              <Badge variant="outline" className="flex items-center gap-1 px-3">
                <TrendingUp className="h-4 w-4" />
                {leadsPerWeek}/week
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              How many leads do you expect to receive each week?
            </p>
          </div>

          <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calculator className="h-4 w-4" />
                  Monthly Projection
                </div>
                <div className="text-4xl font-bold text-primary">
                  ~{monthlyLeads}
                </div>
                <div className="text-xs text-muted-foreground">
                  leads per month ({leadsPerWeek} × 4.33 weeks)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/10 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Sparkles className="h-8 w-8 mx-auto text-blue-600" />
                <div className="text-sm text-muted-foreground">Projected Monthly Cost</div>
                <div className="text-4xl font-bold text-blue-600">
                  ${projectedCost.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-950/10 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <TrendingUp className="h-8 w-8 mx-auto text-purple-600" />
                <div className="text-sm text-muted-foreground">Avg Cost Per Lead</div>
                <div className="text-4xl font-bold text-purple-600">
                  ${avgCostPerLead.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-950/10 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Badge className={`text-lg px-4 py-2 ${
                  monthlyLeads <= 10 ? 'bg-blue-500' :
                  monthlyLeads <= 50 ? 'bg-purple-500' :
                  'bg-amber-500'
                } text-white`}>
                  {monthlyLeads <= 10 ? 'Standard Rate' :
                   monthlyLeads <= 50 ? 'Volume Discount' :
                   'Best Bulk Rate'}
                </Badge>
                <div className="text-sm text-muted-foreground">Expected Tier</div>
                <div className="text-2xl font-bold text-amber-600">
                  Lead #s 1-{monthlyLeads}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progression Chart */}
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Week-by-Week Progression
          </h3>
          <div className="grid gap-3">
            {weeks.map((week) => (
              <Card key={week.week} className="hover:shadow-md transition-shadow hover-scale">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Week {week.week}
                      </Badge>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Cumulative Leads</div>
                        <div className="font-semibold text-lg">
                          {week.totalLeads} leads
                          <span className="text-xs text-muted-foreground ml-2">
                            (JAN#1 - JAN#{week.totalLeads})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground text-sm">Total Cost</div>
                      <div className="text-2xl font-bold text-primary">
                        ${week.totalCost.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tier Milestone Alert */}
        {monthlyLeads > 10 && monthlyLeads < 51 && (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-500 text-white">🎯 Volume Discount Active</Badge>
              <span className="text-sm">
                You're in the Volume Discount tier! {51 - monthlyLeads} more leads to unlock Best Bulk Rate.
              </span>
            </div>
          </div>
        )}
        {monthlyLeads >= 51 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-500 text-white">🎉 Best Rate Unlocked!</Badge>
              <span className="text-sm">
                You've reached the Best Bulk Rate tier! Maximum savings on every lead from here on.
              </span>
            </div>
          </div>
        )}

        {/* Bottom Note */}
        <div className="p-4 bg-accent/20 rounded-lg border border-accent text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">💡 Note:</strong> These are projections based on your expected weekly lead volume. 
            Actual costs depend on the exact number of leads you receive each month. All pricing resets on the 1st of each month.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
