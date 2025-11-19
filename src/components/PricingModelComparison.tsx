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
      fixedPrice: "9%/8%/4% escrow fee per milestone",
      hourly: "9%/8%/4% escrow fee + tier-based upcharge",
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
                  <strong>Escrow fee (9%/8%/4% based on tier)</strong> applies to each milestone payment for secure fund management, with a $10 minimum per payment
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

        {/* Real-World Examples */}
        <div className="mt-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Real-World Project Examples</h3>
            <p className="text-muted-foreground">See how costs break down for actual projects</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Fixed-Price Example */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle>E-Commerce Website Build</CardTitle>
                  <Badge variant="default">Fixed-Price</Badge>
                </div>
                <CardDescription>Complete custom e-commerce platform with payment integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Project Scope:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Custom design and branding</li>
                    <li>• 50 product listings setup</li>
                    <li>• Payment gateway integration</li>
                    <li>• Admin dashboard</li>
                    <li>• Mobile responsive design</li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Cost Breakdown:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Milestone 1: Design & Setup</span>
                      <span className="font-medium">$2,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Milestone 2: Development</span>
                      <span className="font-medium">$4,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Milestone 3: Testing & Launch</span>
                      <span className="font-medium">$2,000</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">$8,000</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Escrow fee (9% Free tier)</span>
                      <span>$720</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold">
                      <span>Total Project Cost</span>
                      <span className="text-primary">$8,400</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Timeline:</strong> 8 weeks • <strong>Security:</strong> Funds held in escrow until each milestone approved
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Hourly Rate Example */}
            <Card className="border-2 border-border">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle>Website Maintenance & Updates</CardTitle>
                  <Badge variant="secondary">Hourly Rate</Badge>
                </div>
                <CardDescription>Ongoing support and feature improvements for existing site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Project Scope:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Bug fixes and troubleshooting</li>
                    <li>• Content updates as needed</li>
                    <li>• Performance optimization</li>
                    <li>• Security patches</li>
                    <li>• Small feature additions</li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Cost Breakdown:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hourly rate</span>
                      <span className="font-medium">$75/hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average monthly hours</span>
                      <span className="font-medium">20 hours</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Work completed</span>
                      <span className="font-medium">$1,500</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Platform subscription (Pro tier)</span>
                      <span>$79/month</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold">
                      <span>Total Monthly Cost</span>
                      <span className="text-primary">$1,579</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Timeline:</strong> Ongoing monthly • <strong>Flexibility:</strong> Scale hours up or down based on needs
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Takeaway */}
        <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Key Takeaway</h3>
          <p className="text-muted-foreground">
            <strong>Fixed-price contracts</strong> provide budget certainty and escrow protection, making them ideal for larger, well-defined projects. 
            The tier-based escrow fee (9%/8%/4%) ensures secure milestone-based payments. <strong>Hourly rate projects</strong> offer flexibility and are better suited 
            for ongoing work or when the scope isn't fully defined upfront. Choose based on your project's needs and your risk tolerance.
          </p>
        </div>
      </div>
    </section>
  );
}
