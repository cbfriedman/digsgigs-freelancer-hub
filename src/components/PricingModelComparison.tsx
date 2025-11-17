import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PricingModelComparison() {
  const features = [
    {
      feature: "Payment Structure",
      fixedPrice: "Milestone-based payments",
      hourly: "Pay-as-you-go by the hour",
    },
    {
      feature: "Budget Certainty",
      fixedPrice: "Fixed total cost agreed upfront",
      hourly: "Variable cost based on time spent",
    },
    {
      feature: "Escrow Protection",
      fixedPrice: "Funds held in escrow until milestones complete",
      hourly: "Direct payment after work is done",
    },
    {
      feature: "Platform Fee",
      fixedPrice: "5% of milestone payment",
      hourly: "Based on subscription tier",
    },
    {
      feature: "Best For",
      fixedPrice: "Defined projects with clear scope",
      hourly: "Ongoing work or unclear scope",
    },
    {
      feature: "Risk Distribution",
      fixedPrice: "Shared between both parties",
      hourly: "More risk for the consumer",
    },
    {
      feature: "Flexibility",
      fixedPrice: "Less flexible, scope must be clear",
      hourly: "More flexible, easy to adjust",
    },
    {
      feature: "Dispute Resolution",
      fixedPrice: "Escrow provides built-in protection",
      hourly: "Standard contract terms apply",
    },
  ];

  const whenToUse = {
    fixedPrice: [
      "Project has a well-defined scope and deliverables",
      "You want budget certainty from the start",
      "Large projects that benefit from milestone tracking",
      "You want payment protection via escrow",
      "Clear timeline and specifications exist",
    ],
    hourly: [
      "Project scope is uncertain or evolving",
      "You need ongoing maintenance or support",
      "Smaller, short-term projects",
      "You prefer flexibility to adjust as you go",
      "Quick turnaround projects",
    ],
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Fixed-Price vs. Hourly Rate Projects</h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Choose the pricing model that best fits your project needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Fixed-Price Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Fixed-Price Contracts</CardTitle>
                <Badge variant="default">With Escrow</Badge>
              </div>
              <CardDescription>
                Ideal for well-defined projects with clear deliverables and milestones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">When to Use:</h4>
                <ul className="space-y-2">
                  {whenToUse.fixedPrice.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>5% escrow fee</strong> applies to each milestone payment for secure fund management
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Hourly Rate Card */}
          <Card className="border-2 border-border">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Hourly Rate Projects</CardTitle>
                <Badge variant="secondary">Flexible</Badge>
              </div>
              <CardDescription>
                Best for ongoing work, maintenance, or projects with evolving requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">When to Use:</h4>
                <ul className="space-y-2">
                  {whenToUse.hourly.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>No escrow fees</strong> - fees based on your subscription tier only
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Comparison</CardTitle>
            <CardDescription>
              Compare key features side-by-side to make an informed decision
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-4 px-4 font-semibold">Feature</th>
                    <th className="text-left py-4 px-4 font-semibold">
                      <div className="flex items-center gap-2">
                        Fixed-Price
                        <Badge variant="default" className="text-xs">Escrow</Badge>
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 font-semibold">Hourly Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((row, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-4 px-4 font-medium">{row.feature}</td>
                      <td className="py-4 px-4 text-sm">{row.fixedPrice}</td>
                      <td className="py-4 px-4 text-sm">{row.hourly}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Key Takeaway */}
        <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Key Takeaway</h3>
          <p className="text-muted-foreground">
            <strong>Fixed-price contracts</strong> provide budget certainty and escrow protection, making them ideal for larger, well-defined projects. 
            The 5% escrow fee ensures secure milestone-based payments. <strong>Hourly rate projects</strong> offer flexibility and are better suited 
            for ongoing work or when the scope isn't fully defined upfront. Choose based on your project's needs and your risk tolerance.
          </p>
        </div>
      </div>
    </section>
  );
}
