import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, TrendingDown, Shield, Zap, Target } from "lucide-react";
import { getLeadCostForIndustry } from "@/config/pricing";

export default function CompetitiveAdvantageShowcase() {
  // Sample calculation for HVAC (mid-value industry)
  const industry = "HVAC";
  const freeTier = getLeadCostForIndustry(industry, 'free');
  const proTier = getLeadCostForIndustry(industry, 'pro');
  const premiumTier = getLeadCostForIndustry(industry, 'premium');

  const competitorData = [
    {
      name: "HomeAdvisor",
      monthlyFee: "$0",
      leadCost: "$60",
      volumeDiscount: "None",
      escrow: "Not available",
      leadQuality: "Shared (3-5 pros)",
      advantages: ["Established brand"],
      disadvantages: ["No volume discounts", "Shared leads mean high competition", "Pay for bad leads", "No escrow protection"]
    },
    {
      name: "Thumbtack",
      monthlyFee: "$0",
      leadCost: "$50",
      volumeDiscount: "None",
      escrow: "Limited",
      leadQuality: "Shared",
      advantages: ["Direct messaging"],
      disadvantages: ["Flat pricing regardless of volume", "Pay to quote (no guarantee of work)", "High competition", "No meaningful volume benefits"]
    },
    {
      name: "Google AdWords",
      monthlyFee: "$0",
      leadCost: "$160 effective*",
      volumeDiscount: "None",
      escrow: "None",
      leadQuality: "Unvetted clicks",
      advantages: ["Full control", "Direct reach"],
      disadvantages: ["25% click-to-lead rate = 4x cost", "No quality guarantees", "Requires expertise", "Time-intensive management"]
    },
    {
      name: "Bark",
      monthlyFee: "$0",
      leadCost: "$45",
      volumeDiscount: "None",
      escrow: "Limited",
      leadQuality: "Shared",
      advantages: ["Simple credit system"],
      disadvantages: ["No volume discounts", "Credits expire", "Lead sharing", "Flat pricing"]
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
      title: "Automatic Volume Discounts",
      description: "Save up to 33% as you buy more leads each month. No commitment required - just pay as you go.",
      value: `${freeTier} → ${proTier} → ${premiumTier} per lead (HVAC)`
    },
    {
      icon: <Shield className="h-5 w-5 text-blue-600" />,
      title: "Optional Escrow Protection",
      description: "Only pay 8% escrow fee if the gig poster requests it. Unlike competitors, escrow is your choice.",
      value: "8% only when requested"
    },
    {
      icon: <Zap className="h-5 w-5 text-purple-600" />,
      title: "Exclusive Leads",
      description: "Every lead is yours alone. No sharing with 3-5 other pros like on competitor platforms.",
      value: "100% exclusive"
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
                The only platform designed to reward your growth with automatic savings
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
            See exactly how we stack up against major competitors (based on HVAC industry)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-primary/20">
                  <th className="text-left p-4 font-bold">Platform</th>
                  <th className="text-left p-4 font-bold">Monthly Fee</th>
                  <th className="text-left p-4 font-bold">Cost Per Lead</th>
                  <th className="text-left p-4 font-bold">Volume Discount</th>
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
                      ${freeTier} → ${proTier} → ${premiumTier}
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-decreases with volume</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">Up to 33%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-semibold">Exclusive</span>
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
                      <span>{competitor.leadCost}</span>
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
              DigsandGigs is the <strong>only platform</strong> that automatically reduces your cost per lead as your volume grows - 
              saving you up to 33% compared to our standard rate. Competitors charge the same flat rate whether you buy 10 leads or 100.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Real Cost Comparison Examples */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="text-2xl text-green-700 dark:text-green-400">Real Monthly Cost Examples</CardTitle>
          <CardDescription>
            See your actual savings with DigsandGigs vs. competitors (HVAC industry)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* 20 Leads Example */}
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">20 Leads/Month</CardTitle>
                <CardDescription>Small volume buyer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">DigsandGigs:</span>
                    <span className="font-bold text-primary">
                      ${(10 * freeTier + 10 * proTier).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HomeAdvisor:</span>
                    <span className="font-bold text-red-600">$1,200.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Thumbtack:</span>
                    <span className="font-bold text-red-600">$1,000.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yelp:</span>
                    <span className="font-bold text-red-600">$300.00+ (no guarantee)</span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-green-600">
                      Save ${(1200 - (10 * freeTier + 10 * proTier)).toFixed(2)} vs HomeAdvisor
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 50 Leads Example */}
            <Card className="bg-background border-primary">
              <CardHeader>
                <CardTitle className="text-lg">50 Leads/Month</CardTitle>
                <CardDescription>Medium volume buyer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">DigsandGigs:</span>
                    <span className="font-bold text-primary">
                      ${(10 * freeTier + 40 * proTier).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HomeAdvisor:</span>
                    <span className="font-bold text-red-600">$3,000.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Thumbtack:</span>
                    <span className="font-bold text-red-600">$2,500.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yelp:</span>
                    <span className="font-bold text-red-600">$300.00+ (no guarantee)</span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-green-600">
                      Save ${(3000 - (10 * freeTier + 40 * proTier)).toFixed(2)} vs HomeAdvisor
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 100 Leads Example */}
            <Card className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">100 Leads/Month</CardTitle>
                <CardDescription>High volume buyer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">DigsandGigs:</span>
                    <span className="font-bold text-primary">
                      ${(10 * freeTier + 40 * proTier + 50 * premiumTier).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HomeAdvisor:</span>
                    <span className="font-bold text-red-600">$6,000.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Thumbtack:</span>
                    <span className="font-bold text-red-600">$5,000.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yelp:</span>
                    <span className="font-bold text-red-600">$300.00+ (no guarantee)</span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-green-600">
                      Save ${(6000 - (10 * freeTier + 40 * proTier + 50 * premiumTier)).toFixed(2)} vs HomeAdvisor
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <p className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">
              📊 The Math is Clear: DigsandGigs offers 30-50% savings compared to competitors
            </p>
            <ul className="text-sm text-green-700 dark:text-green-400 space-y-1 ml-4">
              <li>✓ At 20 leads: Save $100-$400/month</li>
              <li>✓ At 50 leads: Save $500-$1,200/month</li>
              <li>✓ At 100 leads: Save $1,200-$2,600/month</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Line */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <h3 className="text-3xl font-bold">The Bottom Line</h3>
            <p className="text-lg opacity-90 max-w-3xl mx-auto">
              DigsandGigs is the <strong>only platform</strong> that rewards your growth with automatic volume discounts, 
              offers exclusive leads (not shared with competitors), and provides optional escrow protection - all with zero monthly fees.
            </p>
            <div className="pt-4">
              <p className="text-xl font-bold">
                Why pay more for shared leads when you can pay less for exclusive ones?
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
