import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { INDUSTRY_PRICING, getAllIndustries, getLeadCostForIndustry } from "@/config/pricing";

export default function LeadCostTimeline() {
  const [selectedIndustry, setSelectedIndustry] = useState('HVAC');
  const industries = getAllIndustries();

  const tier1Cost = getLeadCostForIndustry(selectedIndustry, 'free');
  const tier2Cost = getLeadCostForIndustry(selectedIndustry, 'pro');
  const tier3Cost = getLeadCostForIndustry(selectedIndustry, 'premium');

  const timelinePoints = [
    { 
      leadNumber: "#1", 
      label: "First Lead", 
      cost: tier1Cost, 
      tier: "Standard Rate",
      color: "from-blue-500 to-blue-600",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      position: "0%"
    },
    { 
      leadNumber: "#10", 
      label: "Lead 10", 
      cost: tier1Cost, 
      tier: "Standard Rate",
      color: "from-blue-500 to-blue-600",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      position: "20%"
    },
    { 
      leadNumber: "#11", 
      label: "Volume Discount Starts", 
      cost: tier2Cost, 
      tier: "Volume Discount",
      color: "from-purple-500 to-purple-600",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      position: "40%",
      milestone: true
    },
    { 
      leadNumber: "#50", 
      label: "Lead 50", 
      cost: tier2Cost, 
      tier: "Volume Discount",
      color: "from-purple-500 to-purple-600",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      position: "70%"
    },
    { 
      leadNumber: "#51", 
      label: "Best Rate Unlocked", 
      cost: tier3Cost, 
      tier: "Best Bulk Rate",
      color: "from-amber-500 to-amber-600",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      position: "100%",
      milestone: true
    }
  ];

  const savingsPercent1to2 = Math.round(((tier1Cost - tier2Cost) / tier1Cost) * 100);
  const savingsPercent1to3 = Math.round(((tier1Cost - tier3Cost) / tier1Cost) * 100);

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingDown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Monthly Lead Cost Timeline</CardTitle>
              <CardDescription className="mt-2">
                Watch your costs decrease as you receive more leads each month
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Industry:</label>
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
        {/* Savings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">${tier1Cost}</div>
                <div className="text-sm text-muted-foreground mt-1">Lead #1-10</div>
                <Badge variant="outline" className="mt-2">Standard Rate</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">${tier2Cost}</div>
                <div className="text-sm text-muted-foreground mt-1">Lead #11-50</div>
                <Badge variant="outline" className="mt-2 bg-green-100 text-green-700 border-green-300">
                  Save {savingsPercent1to2}%
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">${tier3Cost}</div>
                <div className="text-sm text-muted-foreground mt-1">Lead #51+</div>
                <Badge variant="outline" className="mt-2 bg-green-100 text-green-700 border-green-300">
                  Save {savingsPercent1to3}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visual Timeline */}
        <div className="relative pt-8 pb-4">
          {/* Timeline Line */}
          <div className="absolute top-16 left-0 w-full h-1 bg-gradient-to-r from-blue-300 via-purple-300 to-amber-300 rounded-full" />
          
          {/* Timeline Points */}
          <div className="relative">
            {timelinePoints.map((point, index) => (
              <div
                key={point.leadNumber}
                className="absolute transform -translate-x-1/2 animate-fade-in"
                style={{ 
                  left: point.position,
                  animationDelay: `${index * 100}ms`
                }}
              >
                {/* Vertical Line */}
                <div className={`w-0.5 h-8 mx-auto bg-gradient-to-b ${point.color} mb-2`} />
                
                {/* Point Circle */}
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${point.color} border-4 border-background shadow-lg mx-auto mb-3 hover-scale ${point.milestone ? 'animate-pulse' : ''}`} />
                
                {/* Content Card */}
                <Card className={`w-40 ${point.bgColor} border-2 hover:shadow-lg transition-all duration-300 hover-scale`}>
                  <CardContent className="p-3 text-center">
                    <div className={`text-lg font-bold ${point.textColor} mb-1`}>
                      {point.leadNumber}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {point.label}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-sm font-bold">
                      <DollarSign className="h-3 w-3" />
                      <span>{point.cost}</span>
                    </div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {point.tier}
                    </Badge>
                    {point.milestone && (
                      <div className="mt-2">
                        <Badge className="bg-green-500 text-white text-xs">
                          🎉 Milestone
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Spacing for Timeline Cards */}
        <div className="h-48" />

        {/* Example Calculation */}
        <div className="p-5 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Example: Monthly Cost for {selectedIndustry}
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">If you receive 10 leads:</p>
              <p className="text-xl font-bold text-blue-600">
                ${tier1Cost * 10} <span className="text-xs font-normal text-muted-foreground">(10 × ${tier1Cost})</span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">If you receive 30 leads:</p>
              <p className="text-xl font-bold text-purple-600">
                ${(tier1Cost * 10) + (tier2Cost * 20)} <span className="text-xs font-normal text-muted-foreground">(10 × ${tier1Cost} + 20 × ${tier2Cost})</span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">If you receive 60 leads:</p>
              <p className="text-xl font-bold text-amber-600">
                ${(tier1Cost * 10) + (tier2Cost * 40) + (tier3Cost * 10)} <span className="text-xs font-normal text-muted-foreground">(tiered)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-accent/20 rounded-lg border border-accent">
            <h4 className="font-semibold mb-2">💡 How It Works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ First 10 leads each month cost standard rate</li>
              <li>✓ Leads 11-50 automatically get volume discount</li>
              <li>✓ Lead 51+ get the best bulk pricing</li>
              <li>✓ Resets on the 1st of each month</li>
            </ul>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-semibold mb-2 text-green-700 dark:text-green-400">🎯 Maximize Savings</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ More leads = lower average cost per lead</li>
              <li>✓ No caps on how many leads you can receive</li>
              <li>✓ The more you grow, the more you save</li>
              <li>✓ Completely transparent pricing structure</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
