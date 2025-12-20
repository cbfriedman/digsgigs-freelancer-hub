import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLeadCostForIndustry, getAllIndustries } from "@/config/pricing";
import { Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface BarkPricingData {
  credits: number;
  costPerLead: number;
}

// Bark.com pricing structure (1 credit = $2.20)
const BARK_PRICING: Record<string, BarkPricingData> = {
  'Cleaning & Janitorial': { credits: 3, costPerLead: 6.60 },
  'Handyman Services': { credits: 4, costPerLead: 8.80 },
  'Pet Care & Grooming': { credits: 3, costPerLead: 6.60 },
  'Tutoring & Education': { credits: 4, costPerLead: 8.80 },
  'Moving & Delivery': { credits: 4, costPerLead: 8.80 },
  'Event Planning': { credits: 5, costPerLead: 11.00 },
  'HVAC': { credits: 10, costPerLead: 22.00 },
  'Plumbing': { credits: 10, costPerLead: 22.00 },
  'Electrical': { credits: 10, costPerLead: 22.00 },
  'Landscaping': { credits: 8, costPerLead: 17.60 },
  'Roofing': { credits: 12, costPerLead: 26.40 },
  'Carpentry': { credits: 8, costPerLead: 17.60 },
  'Painting': { credits: 7, costPerLead: 15.40 },
  'General Contracting': { credits: 12, costPerLead: 26.40 },
  'Legal Services': { credits: 25, costPerLead: 55.00 },
  'Financial Services': { credits: 22, costPerLead: 48.40 },
  'Real Estate': { credits: 20, costPerLead: 44.00 },
  'Web Development': { credits: 10, costPerLead: 22.00 },
};

export const BarkComparisonTable = () => {
  const allIndustries = getAllIndustries();
  const [selectedIndustry, setSelectedIndustry] = useState<string>(allIndustries[0]);

  const barkData = BARK_PRICING[selectedIndustry] || { credits: 10, costPerLead: 22.00 };
  const digsAndGigsCost = getLeadCostForIndustry(selectedIndustry);

  // Calculate savings percentage
  const savingsPercent = ((barkData.costPerLead - digsAndGigsCost) / barkData.costPerLead * 100).toFixed(0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">DigsandGigs vs Bark.com: Cost Per Lead Comparison</CardTitle>
        <CardDescription>
          See how our transparent, industry-based pricing compares to Bark's credit system
          <span className="block text-xs text-muted-foreground/60 mt-1">
            Note: Prices fluctuate daily and are subject to change
          </span>
        </CardDescription>
        <div className="mt-4">
          <label className="text-sm font-medium mb-2 block">Select Industry:</label>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger>
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
              <tr className="border-b-2 border-border">
                <th className="text-left p-4 font-semibold">Platform</th>
                <th className="text-center p-4 font-semibold">Pricing Model</th>
                <th className="text-center p-4 font-semibold">Cost Per Lead</th>
                <th className="text-center p-4 font-semibold">Monthly Fee</th>
                <th className="text-right p-4 font-semibold">Your Savings</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    Bark.com
                    <Badge variant="outline">Competitor</Badge>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="text-sm">Credit-Based</div>
                  <div className="text-xs text-muted-foreground">
                    {barkData.credits} credits @ $2.20/credit
                  </div>
                </td>
                <td className="p-4 text-center font-semibold text-lg">
                  ${barkData.costPerLead.toFixed(2)}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">$0</span>
                  </div>
                </td>
                <td className="p-4 text-right text-muted-foreground">
                  Baseline
                </td>
              </tr>

              <tr className="border-b border-border bg-primary/5">
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    DigsandGigs
                    <Badge variant="default">Our Platform</Badge>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="text-sm">Industry-Based</div>
                  <div className="text-xs text-muted-foreground">
                    Transparent pricing
                  </div>
                </td>
                <td className="p-4 text-center font-semibold text-lg text-primary">
                  ${digsAndGigsCost.toFixed(2)}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">$0</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  {Number(savingsPercent) > 0 ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      Save {savingsPercent}%
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Competitive
                    </Badge>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Why DigsandGigs Wins</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Industry-Specific:</strong> Pricing tailored to your trade, not one-size-fits-all</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Transparent Pricing:</strong> Know exactly what you'll pay per lead</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Simple Model:</strong> No complex credit calculations or balances to manage</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bark.com Limitations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span><strong>Shared Leads:</strong> Compete with multiple pros for the same customer</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span><strong>Credit System:</strong> Must buy credits upfront, manage balances</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span><strong>Variable Costs:</strong> Credit prices change by job, harder to predict costs</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Real-World Example</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold mb-1">Scenario: 25 leads/month</div>
                  <div className="text-muted-foreground">Industry: {selectedIndustry}</div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bark.com Total:</span>
                    <span className="font-semibold">${(barkData.costPerLead * 25).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>DigsandGigs:</span>
                    <span className="font-semibold">${(digsAndGigsCost * 25).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 border-t pt-2">
                    <span className="font-semibold">Your Savings:</span>
                    <span className="font-semibold">${(barkData.costPerLead * 25 - digsAndGigsCost * 25).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
