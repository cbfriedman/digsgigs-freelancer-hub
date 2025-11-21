import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { getLeadCostForIndustry, INDUSTRY_PRICING, getIndustryCategory } from "@/config/pricing";
import { TrendingDown, Award, DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function CompetitorCostComparison() {
  const [leadVolume, setLeadVolume] = useState(30);
  const [selectedIndustry, setSelectedIndustry] = useState('HVAC');
  const [exclusivity, setExclusivity] = useState<'non-exclusive' | 'exclusive-24h'>('non-exclusive');

  // DigsandGigs costs - industry-specific
  const digsAndGigsCost = getLeadCostForIndustry(selectedIndustry, exclusivity);

  const calculateDigsAndGigsCost = (leads: number) => {
    return leads * digsAndGigsCost;
  };

  // Get industry-specific competitor pricing
  const industryCategory = getIndustryCategory(selectedIndustry);
  const getCompetitorLeadCost = (platform: string): number => {
    // Industry-specific pricing for competitors
    if (industryCategory === 'low-value') {
      return platform === 'HomeAdvisor' ? 30 : platform === 'Thumbtack' ? 25 : 22;
    } else if (industryCategory === 'high-value') {
      return platform === 'HomeAdvisor' ? 150 : platform === 'Thumbtack' ? 125 : 110;
    } else { // mid-value
      return platform === 'HomeAdvisor' ? 60 : platform === 'Thumbtack' ? 50 : 45;
    }
  };

  const platforms = [
    {
      name: "DigsandGigs",
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      cost: calculateDigsAndGigsCost(leadVolume),
      description: `${exclusivity === 'non-exclusive' ? 'Non-Exclusive (Bark - $0.50)' : '24-Hour Exclusive (CPC × 2.5)'}`,
      badge: "Our Platform",
      badgeColor: "bg-primary text-white"
    },
    {
      name: "HomeAdvisor",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      borderColor: "border-orange-200 dark:border-orange-800",
      cost: leadVolume * getCompetitorLeadCost('HomeAdvisor'),
      description: "Flat rate per lead",
      badge: "Competitor",
      badgeColor: "bg-orange-500 text-white"
    },
    {
      name: "Thumbtack",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      cost: leadVolume * getCompetitorLeadCost('Thumbtack'),
      description: "Pay per introduction",
      badge: "Competitor",
      badgeColor: "bg-blue-500 text-white"
    },
    {
      name: "Bark",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      borderColor: "border-purple-200 dark:border-purple-800",
      cost: leadVolume * getCompetitorLeadCost('Bark'),
      description: "Credit-based system",
      badge: "Competitor",
      badgeColor: "bg-purple-500 text-white"
    }
  ];

  const sortedPlatforms = [...platforms].sort((a, b) => a.cost - b.cost);
  const lowestCost = sortedPlatforms[0].cost;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Platform Cost Comparison</CardTitle>
              <CardDescription className="mt-2">
                See how DigsandGigs stacks up against competitors
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Industry:</Label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {INDUSTRY_PRICING.map((pricing) => (
                    <div key={pricing.category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {pricing.category === 'low-value' && 'Low-Value'}
                        {pricing.category === 'mid-value' && 'Mid-Value'}
                        {pricing.category === 'high-value' && 'High-Value'}
                      </div>
                      {pricing.industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Exclusivity:</Label>
              <Select value={exclusivity} onValueChange={(v) => setExclusivity(v as 'non-exclusive' | 'exclusive-24h')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non-exclusive">Non-Exclusive</SelectItem>
                  <SelectItem value="exclusive-24h">24-Hour Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Lead Volume:</Label>
              <Select value={leadVolume.toString()} onValueChange={(v) => setLeadVolume(parseInt(v))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 40, 50, 75, 100].map((vol) => (
                    <SelectItem key={vol} value={vol.toString()}>
                      {vol} leads
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Comparison Bars */}
        <div className="space-y-4">
          {sortedPlatforms.map((platform, index) => {
            const savings = platform.cost - lowestCost;
            const widthPercent = (platform.cost / sortedPlatforms[sortedPlatforms.length - 1].cost) * 100;
            const isDigsAndGigs = platform.name === "DigsandGigs";
            const isCheapest = platform.cost === lowestCost;

            return (
              <Card 
                key={platform.name} 
                className={`${isDigsAndGigs ? 'border-2 border-primary shadow-lg' : platform.borderColor} ${platform.bgColor} transition-all hover:shadow-md hover-scale`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={platform.badgeColor}>
                          {isCheapest && "🏆 "}
                          {platform.badge}
                        </Badge>
                        <div>
                          <div className="font-semibold text-lg">{platform.name}</div>
                          <div className="text-xs text-muted-foreground">{platform.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${platform.color}`}>
                          ${platform.cost.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${(platform.cost / leadVolume).toFixed(2)} per lead
                        </div>
                      </div>
                    </div>

                    {/* Visual Bar */}
                    <div className="relative w-full h-8 bg-background rounded-full overflow-hidden border border-border">
                      <div 
                        className={`h-full bg-gradient-to-r ${
                          isDigsAndGigs 
                            ? 'from-primary to-primary/70' 
                            : 'from-gray-400 to-gray-500'
                        } transition-all duration-1000 ease-out animate-scale-in flex items-center justify-end pr-3`}
                        style={{ width: `${widthPercent}%` }}
                      >
                        {widthPercent > 20 && (
                          <span className="text-white text-xs font-semibold">
                            ${platform.cost.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Savings Badge */}
                    {savings > 0 && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          vs. DigsandGigs
                        </span>
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20">
                          +${savings.toLocaleString()} more expensive
                        </Badge>
                      </div>
                    )}
                    {isDigsAndGigs && savings === 0 && isCheapest && (
                      <div className="flex items-center justify-center pt-2">
                        <Badge className="bg-green-500 text-white">
                          ✓ Lowest Cost Option
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-950/10 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <TrendingDown className="h-8 w-8 mx-auto text-green-600" />
                <div className="text-sm text-muted-foreground">Your Savings vs. HomeAdvisor</div>
                <div className="text-3xl font-bold text-green-600">
                  ${(platforms[1].cost - platforms[0].cost).toLocaleString()}
                </div>
                <Badge className="bg-green-500 text-white">
                  {Math.round(((platforms[1].cost - platforms[0].cost) / platforms[1].cost) * 100)}% Saved
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/10 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <DollarSign className="h-8 w-8 mx-auto text-blue-600" />
                <div className="text-sm text-muted-foreground">Cost Per Lead</div>
                <div className="text-3xl font-bold text-blue-600">
                  ${digsAndGigsCost.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">with DigsandGigs</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Award className="h-8 w-8 mx-auto text-primary" />
                <div className="text-sm text-muted-foreground">Your Ranking</div>
                <div className="text-3xl font-bold text-primary">
                  #1
                </div>
                <Badge className="bg-primary text-white">
                  Lowest Price
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Advantages */}
        <Card className="bg-accent/20 border-accent">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">🎯 Why DigsandGigs Costs Less:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <p><strong>Choose Your Exclusivity:</strong> Pay less for non-exclusive or more for 24-hour exclusive leads</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <p><strong>No Hidden Fees:</strong> What you see is what you pay - no surprise charges</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <p><strong>Transparent Pricing:</strong> Every lead is priced clearly based on Bark or Google CPC rates</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <p><strong>Fair 8% Escrow:</strong> Lower than most platforms and protects both parties</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}