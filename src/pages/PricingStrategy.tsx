import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingDown, Target, Users, DollarSign, Award, AlertCircle, Lightbulb, Calculator } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const PricingStrategy = () => {
  const navigate = useNavigate();

  const categoryAverages = [
    { category: "Web Development", avgRate: "$75-150/hr", competitive: "$100-125/hr" },
    { category: "Graphic Design", avgRate: "$50-100/hr", competitive: "$75-90/hr" },
    { category: "Writing & Content", avgRate: "$40-80/hr", competitive: "$60-75/hr" },
    { category: "Marketing", avgRate: "$60-120/hr", competitive: "$85-110/hr" },
    { category: "Consulting", avgRate: "$100-200/hr", competitive: "$120-175/hr" },
    { category: "Photography", avgRate: "$75-150/hr", competitive: "$100-130/hr" },
  ];

  const pricingStrategies = [
    {
      title: "Entry Strategy",
      icon: TrendingDown,
      description: "Start 10-15% below market average",
      pros: ["More lead opportunities", "Build portfolio & reviews", "Learn client needs"],
      cons: ["Lower margins", "May attract budget clients"],
      best: "New diggers building reputation"
    },
    {
      title: "Market Rate Strategy",
      icon: Target,
      description: "Price at category average",
      pros: ["Balanced volume & margin", "Attract quality clients", "Sustainable growth"],
      cons: ["Medium competition", "Requires strong profile"],
      best: "Established diggers with proven track record"
    },
    {
      title: "Premium Strategy",
      icon: Award,
      description: "Price 15-25% above average",
      pros: ["Higher margins", "Selective clients", "Premium positioning"],
      cons: ["Fewer leads", "Need exceptional profile", "Higher expectations"],
      best: "Experts with specialized skills & stellar reviews"
    },
  ];

  const competitiveTips = [
    {
      title: "Minimum $100 Lead Cost",
      description: "Your hourly rate determines lead costs (minimum $100). Lower rates = lower lead acquisition costs = competitive advantage.",
      icon: DollarSign
    },
    {
      title: "Calculate Your Break-Even",
      description: "If you charge $120/hr and win 1 in 3 leads, your effective lead cost is $360 per won project. Price accordingly.",
      icon: Calculator
    },
    {
      title: "Monitor Win Rate",
      description: "Track how many leads you convert. If your win rate drops, you may be overpriced for your market position.",
      icon: TrendingDown
    },
    {
      title: "Quality Over Volume",
      description: "A $150/hr rate attracting serious clients may be better than $100/hr with tire-kickers.",
      icon: Users
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex h-16 items-center">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Pricing Strategy Guide
            </h1>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Introduction */}
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Understanding Hourly Rate Competition
            </CardTitle>
            <CardDescription className="text-base">
              Your hourly rate directly impacts your lead acquisition cost. This creates natural market competition where diggers with competitive rates get more opportunities while maintaining profitability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                How It Works
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You pay <strong>1 hour of your advertised rate</strong> per lead (minimum $100)</li>
                <li>• Lower hourly rates = lower lead costs = more competitive positioning</li>
                <li>• This creates a "race to the bottom" that keeps prices market-competitive</li>
                <li>• Balance affordability with your actual value and profitability</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Category Averages */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Market Rate Benchmarks by Category</CardTitle>
            <CardDescription>
              Use these ranges as starting points. Actual rates vary by experience, location, and specialization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryAverages.map((cat, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{cat.category}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Average:</span>
                      <span className="font-medium">{cat.avgRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Competitive Range:</span>
                      <Badge variant="secondary">{cat.competitive}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Strategies */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Three Proven Pricing Strategies</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {pricingStrategies.map((strategy, idx) => {
              const Icon = strategy.icon;
              return (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {strategy.title}
                    </CardTitle>
                    <CardDescription>{strategy.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-green-600 mb-2">Advantages:</h4>
                      <ul className="text-sm space-y-1">
                        {strategy.pros.map((pro, i) => (
                          <li key={i} className="text-muted-foreground">✓ {pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-amber-600 mb-2">Considerations:</h4>
                      <ul className="text-sm space-y-1">
                        {strategy.cons.map((con, i) => (
                          <li key={i} className="text-muted-foreground">• {con}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div className="text-sm">
                      <span className="font-semibold">Best for:</span>
                      <p className="text-muted-foreground mt-1">{strategy.best}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Competitive Tips */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Strategic Pricing Tips</CardTitle>
            <CardDescription>
              Advanced strategies to optimize your hourly rate for maximum ROI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {competitiveTips.map((tip, idx) => {
                const Icon = tip.icon;
                return (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{tip.title}</h3>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Example Calculation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Example: Finding Your Optimal Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <h3 className="font-semibold mb-2">Scenario: Web Developer</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market average:</span>
                    <span className="font-medium">$100-150/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your rate:</span>
                    <span className="font-medium text-primary">$120/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lead cost:</span>
                    <span className="font-medium text-primary">$120</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win rate:</span>
                    <span className="font-medium">33% (1 in 3)</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold">Cost per won project:</span>
                    <span className="font-bold text-primary">$360</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average project value:</span>
                    <span className="font-medium">$2,400 (20 hrs)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Net after lead cost:</span>
                    <span className="font-bold text-green-600">$2,040 (85%)</span>
                  </div>
                </div>
              </div>
              <div className="bg-background p-3 rounded">
                <p className="text-sm text-muted-foreground">
                  <strong>Key Insight:</strong> At $120/hr with a 33% win rate, you retain 85% of project value. Lowering your rate to $110/hr would reduce lead costs but also reduce revenue. Find your sweet spot!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button 
            size="lg"
            onClick={() => navigate("/my-profiles?mode=create")}
            className="shadow-lg"
          >
            Update Your Hourly Rate
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Ready to optimize your pricing? Update your profile now.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingStrategy;
