import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, TrendingDown, Shield, Zap, Target } from "lucide-react";
import { getLeadCostForIndustry, getAllIndustries, getIndustryCategory } from "@/config/pricing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function CompetitiveAdvantageShowcase() {
  const allIndustries = getAllIndustries();
  const [selectedIndustry, setSelectedIndustry] = useState<string>("HVAC");
  
  const nonExclusiveCost = getLeadCostForIndustry(selectedIndustry, 'non-exclusive');
  const exclusiveCost = getLeadCostForIndustry(selectedIndustry, 'exclusive-24h');
  
  // Get industry-specific competitor pricing
  const industryCategory = getIndustryCategory(selectedIndustry);
  const getCompetitorLeadCost = (platform: string): number => {
    if (industryCategory === 'low-value') {
      return platform === 'HomeAdvisor' ? 30 : 
             platform === 'Thumbtack' ? 25 : 
             platform === 'Google AdWords' ? 80 :
             platform === 'Bark' ? 15 : 22;
    } else if (industryCategory === 'high-value') {
      return platform === 'HomeAdvisor' ? 150 : 
             platform === 'Thumbtack' ? 125 : 
             platform === 'Google AdWords' ? 400 :
             platform === 'Bark' ? 180 : 110;
    } else { // mid-value
      return platform === 'HomeAdvisor' ? 60 : 
             platform === 'Thumbtack' ? 50 : 
             platform === 'Google AdWords' ? 160 :
             platform === 'Bark' ? 45 : 45;
    }
  };

  const competitorData = [
    {
      name: "HomeAdvisor",
      monthlyFee: "$0",
      leadCost: `$${getCompetitorLeadCost('HomeAdvisor')}`,
      volumeDiscount: "None",
      escrow: "Not available",
      leadQuality: "Shared (3-5 pros)",
      advantages: ["Established brand"],
      disadvantages: ["No volume discounts", "Shared leads mean high competition", "Pay for bad leads", "No escrow protection"]
    },
    {
      name: "Thumbtack",
      monthlyFee: "$0",
      leadCost: `$${getCompetitorLeadCost('Thumbtack')}`,
      volumeDiscount: "None",
      escrow: "Limited",
      leadQuality: "Shared",
      advantages: ["Direct messaging"],
      disadvantages: ["Flat pricing regardless of exclusivity", "Pay to quote (no guarantee of work)", "High competition", "No meaningful exclusivity benefits"]
    },
    {
      name: "Google AdWords",
      monthlyFee: "$0",
      leadCost: `$${getCompetitorLeadCost('Google AdWords')} effective*`,
      volumeDiscount: "None",
      escrow: "None",
      leadQuality: "Unvetted clicks",
      advantages: ["Full control", "Direct reach"],
      disadvantages: ["25% click-to-lead rate = 4x cost", "No quality guarantees", "Requires expertise", "Time-intensive management"]
    },
    {
      name: "Bark",
      monthlyFee: "$0",
      leadCost: `$${getCompetitorLeadCost('Bark')}`,
      volumeDiscount: "None",
      escrow: "Limited",
      leadQuality: "Shared",
      advantages: ["Simple credit system"],
      disadvantages: ["No volume discounts", "Varies widely by project value", "Credits expire", "Lead sharing", "Flat pricing"]
    },
    {
      name: "Yelp",
      monthlyFee: "$300",
      leadCost: "Varies",
      volumeDiscount: "None",
      escrow: "None",
      leadQuality: "Passive (not guaranteed)",
      advantages: ["Brand visibility"],
      disadvantages: ["$300/month mandatory fee", "No guaranteed leads", "Review dependency", "Passive system"]
    }
  ];

  const digsandgigsAdvantages = [
    {
      icon: <TrendingDown className="h-5 w-5 text-green-600" />,
      title: "Choose Your Exclusivity",
      description: "Pay based on your exclusivity preference. Non-exclusive at Bark - $0.50, or 24-hour exclusive at Google CPC × 2.5. You choose what works for your business.",
      value: `$${nonExclusiveCost} or $${exclusiveCost} per lead (${selectedIndustry})`
    },
    {
      icon: <Shield className="h-5 w-5 text-blue-600" />,
      title: "Optional Escrow Protection",
      description: "Only pay 8% escrow fee if the gig poster requests it. Unlike competitors, escrow is your choice.",
      value: "8% only when requested"
    },
    {
      icon: <Zap className="h-5 w-5 text-purple-600" />,
      title: "True Exclusive Leads",
      description: "When you choose 24-hour exclusive, the lead is yours alone. No sharing with 3-5 other pros like on competitor platforms.",
      value: "100% exclusive option"
    },
    {
      icon: <Target className="h-5 w-5 text-orange-600" />,
      title: "No Monthly Fees",
      description: "True pay-as-you-go model. Only pay for leads you actually receive. No subscriptions, no commitments.",
      value: "$0/month forever"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Why We're Better Section */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl">Why DigsandGigs Wins</CardTitle>
              <CardDescription className="mt-2 text-base">
                The only platform where you choose between non-exclusive or exclusive leads
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {digsandgigsAdvantages.map((advantage, idx) => (
              <Card key={idx} className="border-primary/20 bg-background">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                      {advantage.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-1">{advantage.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{advantage.description}</p>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {advantage.value}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitive Comparison Table */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Head-to-Head Comparison</CardTitle>
          <CardDescription>
            See exactly how we stack up against major competitors
          </CardDescription>
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Select Industry:</label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allIndustries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-primary/20">
                  <th className="text-left p-4 font-bold">Platform</th>
                  <th className="text-left p-4 font-bold">Monthly Fee</th>
                  <th className="text-left p-4 font-bold">Cost Per Lead</th>
                  <th className="text-left p-4 font-bold">Exclusivity Options</th>
                  <th className="text-left p-4 font-bold">Lead Quality</th>
                  <th className="text-left p-4 font-bold">Escrow</th>
                </tr>
              </thead>
              <tbody>
                {/* DigsandGigs Row */}
                <tr className="bg-primary/5 border-b border-primary/10">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">DigsandGigs</span>
                      <Badge className="bg-primary text-white text-xs">You</Badge>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-green-600">$0</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-primary">
                      ${nonExclusiveCost} or ${exclusiveCost}
                    </div>
                    <p className="text-xs text-muted-foreground">Your choice of exclusivity</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">Both options</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">Exclusive available</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">Optional 8%</span>
                    </div>
                  </td>
                </tr>

                {/* Competitor Rows */}
                {competitorData.map((competitor, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <span className="font-semibold">{competitor.name}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {competitor.monthlyFee === "$0" ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">{competitor.monthlyFee}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-red-600">{competitor.monthlyFee}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">{competitor.leadCost}</span>
                      {competitor.name === "Google AdWords" && (
                        <p className="text-xs text-muted-foreground">*Assumes 25% conversion</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">{competitor.volumeDiscount}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{competitor.leadQuality}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{competitor.escrow}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-semibold text-primary mb-2">💡 Key Insight:</p>
            <p className="text-sm text-muted-foreground">
              DigsandGigs is the <strong>only platform</strong> that lets you choose between non-exclusive (Bark - $0.50) 
              and 24-hour exclusive leads (Google CPC × 2.5). Competitors offer no such flexibility—you're stuck with their one-size-fits-all approach.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}