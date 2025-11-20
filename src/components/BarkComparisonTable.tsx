import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_PRICING, getLeadCostForIndustry, getAllIndustries } from "@/config/pricing";
import { Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface BarkPricingData {
  credits: number;
  costPerLead: number;
}

// Bark.com pricing structure (1 credit = $2.20)
// Based on service complexity and job value
const BARK_PRICING: Record<string, BarkPricingData> = {
  // Low-value services: 2-5 credits
  'Cleaning & Janitorial': { credits: 3, costPerLead: 6.60 },
  'Handyman Services': { credits: 4, costPerLead: 8.80 },
  'Pet Care & Grooming': { credits: 3, costPerLead: 6.60 },
  'Tutoring & Education': { credits: 4, costPerLead: 8.80 },
  'Moving & Delivery': { credits: 4, costPerLead: 8.80 },
  'Event Planning': { credits: 5, costPerLead: 11.00 },
  'Catering': { credits: 5, costPerLead: 11.00 },
  'Beauty & Wellness': { credits: 3, costPerLead: 6.60 },
  'Data Entry': { credits: 2, costPerLead: 4.40 },
  'Virtual Assistant': { credits: 3, costPerLead: 6.60 },
  'Transcription': { credits: 2, costPerLead: 4.40 },
  'Basic Graphic Design': { credits: 4, costPerLead: 8.80 },
  'Photo Editing': { credits: 3, costPerLead: 6.60 },
  'Simple Logo Design': { credits: 5, costPerLead: 11.00 },
  'Social Media Management': { credits: 4, costPerLead: 8.80 },
  'Content Writing': { credits: 3, costPerLead: 6.60 },
  'Proofreading': { credits: 2, costPerLead: 4.40 },
  'Basic Video Editing': { credits: 4, costPerLead: 8.80 },
  'Voice Over': { credits: 3, costPerLead: 6.60 },
  'Audio Editing': { credits: 3, costPerLead: 6.60 },
  'Product Photography': { credits: 5, costPerLead: 11.00 },
  'Resume Writing': { credits: 3, costPerLead: 6.60 },
  'Translation': { credits: 3, costPerLead: 6.60 },

  // Mid-value services: 6-12 credits
  'HVAC': { credits: 10, costPerLead: 22.00 },
  'Plumbing': { credits: 10, costPerLead: 22.00 },
  'Electrical': { credits: 10, costPerLead: 22.00 },
  'Landscaping': { credits: 8, costPerLead: 17.60 },
  'Roofing': { credits: 12, costPerLead: 26.40 },
  'Carpentry': { credits: 8, costPerLead: 17.60 },
  'Painting': { credits: 7, costPerLead: 15.40 },
  'Flooring': { credits: 9, costPerLead: 19.80 },
  'General Contracting': { credits: 12, costPerLead: 26.40 },
  'Auto Repair': { credits: 8, costPerLead: 17.60 },
  'Appliance Repair': { credits: 7, costPerLead: 15.40 },
  'Pest Control': { credits: 6, costPerLead: 13.20 },
  'Tree Service': { credits: 9, costPerLead: 19.80 },
  'Masonry': { credits: 10, costPerLead: 22.00 },
  'Windows & Doors': { credits: 9, costPerLead: 19.80 },
  'Concrete Work': { credits: 10, costPerLead: 22.00 },
  'Fencing': { credits: 8, costPerLead: 17.60 },
  'Pool Service': { credits: 10, costPerLead: 22.00 },
  'Web Development': { credits: 10, costPerLead: 22.00 },
  'WordPress Development': { credits: 8, costPerLead: 17.60 },
  'E-commerce Development': { credits: 12, costPerLead: 26.40 },
  'Mobile App Development': { credits: 12, costPerLead: 26.40 },
  'Software Development': { credits: 12, costPerLead: 26.40 },
  'UI/UX Design': { credits: 9, costPerLead: 19.80 },
  'Professional Graphic Design': { credits: 8, costPerLead: 17.60 },
  'Brand Identity Design': { credits: 10, costPerLead: 22.00 },
  'Illustration': { credits: 8, costPerLead: 17.60 },
  'Animation': { credits: 10, costPerLead: 22.00 },
  '2D Animation': { credits: 9, costPerLead: 19.80 },
  '3D Modeling': { credits: 12, costPerLead: 26.40 },
  'Video Production': { credits: 12, costPerLead: 26.40 },
  'Professional Video Editing': { credits: 9, costPerLead: 19.80 },
  'Motion Graphics': { credits: 10, costPerLead: 22.00 },
  'Photography': { credits: 8, costPerLead: 17.60 },
  'Architectural Rendering': { credits: 12, costPerLead: 26.40 },
  'SEO Services': { credits: 10, costPerLead: 22.00 },
  'PPC Management': { credits: 11, costPerLead: 24.20 },
  'Email Marketing': { credits: 8, costPerLead: 17.60 },
  'Copywriting': { credits: 7, costPerLead: 15.40 },
  'Content Marketing': { credits: 9, costPerLead: 19.80 },
  'Marketing Strategy': { credits: 12, costPerLead: 26.40 },
  'Business Consulting': { credits: 12, costPerLead: 26.40 },
  'Project Management': { credits: 11, costPerLead: 24.20 },
  'Product Management': { credits: 12, costPerLead: 26.40 },
  'Data Analysis': { credits: 10, costPerLead: 22.00 },
  'Database Design': { credits: 11, costPerLead: 24.20 },
  'System Administration': { credits: 10, costPerLead: 22.00 },
  'Network Administration': { credits: 10, costPerLead: 22.00 },
  'Technical Writing': { credits: 8, costPerLead: 17.60 },
  'Game Development': { credits: 12, costPerLead: 26.40 },
  'Unity Development': { credits: 12, costPerLead: 26.40 },
  'Unreal Engine Development': { credits: 12, costPerLead: 26.40 },

  // High-value services: 15-30+ credits
  'Legal Services': { credits: 25, costPerLead: 55.00 },
  'Patent Law': { credits: 30, costPerLead: 66.00 },
  'Corporate Law': { credits: 28, costPerLead: 61.60 },
  'Immigration Law': { credits: 25, costPerLead: 55.00 },
  'Tax Law': { credits: 27, costPerLead: 59.40 },
  'Insurance': { credits: 20, costPerLead: 44.00 },
  'Life Insurance': { credits: 22, costPerLead: 48.40 },
  'Health Insurance': { credits: 20, costPerLead: 44.00 },
  'Financial Planning': { credits: 25, costPerLead: 55.00 },
  'Investment Advisory': { credits: 28, costPerLead: 61.60 },
  'Wealth Management': { credits: 30, costPerLead: 66.00 },
  'Real Estate': { credits: 20, costPerLead: 44.00 },
  'Commercial Real Estate': { credits: 25, costPerLead: 55.00 },
  'Medical & Dental': { credits: 18, costPerLead: 39.60 },
  'Healthcare Consulting': { credits: 22, costPerLead: 48.40 },
  'Accounting': { credits: 18, costPerLead: 39.60 },
  'Tax Preparation': { credits: 16, costPerLead: 35.20 },
  'CPA Services': { credits: 20, costPerLead: 44.00 },
  'Management Consulting': { credits: 25, costPerLead: 55.00 },
  'Strategy Consulting': { credits: 28, costPerLead: 61.60 },
  'Enterprise Software Development': { credits: 30, costPerLead: 66.00 },
  'Cloud Architecture': { credits: 28, costPerLead: 61.60 },
  'DevOps Consulting': { credits: 25, costPerLead: 55.00 },
  'Cybersecurity Consulting': { credits: 28, costPerLead: 61.60 },
  'Blockchain Development': { credits: 30, costPerLead: 66.00 },
  'AI & Machine Learning': { credits: 30, costPerLead: 66.00 },
  'Data Science': { credits: 28, costPerLead: 61.60 },
  'Big Data Engineering': { credits: 28, costPerLead: 61.60 },
  'IT Consulting': { credits: 22, costPerLead: 48.40 },
  'ERP Implementation': { credits: 30, costPerLead: 66.00 },
  'Salesforce Development': { credits: 25, costPerLead: 55.00 },
  'SAP Consulting': { credits: 30, costPerLead: 66.00 },
  'Architecture': { credits: 25, costPerLead: 55.00 },
  'Structural Engineering': { credits: 28, costPerLead: 61.60 },
  'Civil Engineering': { credits: 27, costPerLead: 59.40 },
  'Mechanical Engineering': { credits: 26, costPerLead: 57.20 },
  'Electrical Engineering': { credits: 26, costPerLead: 57.20 },
  'Industrial Design': { credits: 25, costPerLead: 55.00 },
  'Patent Illustration': { credits: 20, costPerLead: 44.00 },
  'Marketing & Advertising': { credits: 20, costPerLead: 44.00 },
  'Brand Strategy': { credits: 25, costPerLead: 55.00 },
  'Full-Service Marketing': { credits: 28, costPerLead: 61.60 },
  'Media Buying': { credits: 22, costPerLead: 48.40 },
  'Creative Direction': { credits: 25, costPerLead: 55.00 },
  'Public Relations': { credits: 20, costPerLead: 44.00 },
};

export const BarkComparisonTable = () => {
  const allIndustries = getAllIndustries();
  const [selectedIndustry, setSelectedIndustry] = useState<string>(allIndustries[0]);

  const barkData = BARK_PRICING[selectedIndustry] || { credits: 10, costPerLead: 22.00 };
  
  const digsAndGigsNonExclusive = getLeadCostForIndustry(selectedIndustry, 'non-exclusive');
  const digsAndGigsExclusive = getLeadCostForIndustry(selectedIndustry, 'exclusive-24h');

  // Calculate savings percentages
  const savingsNonExclusive = ((barkData.costPerLead - digsAndGigsNonExclusive) / barkData.costPerLead * 100).toFixed(0);
  const savingsExclusive = ((barkData.costPerLead - digsAndGigsExclusive) / barkData.costPerLead * 100).toFixed(0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">DigsandGigs vs Bark.com: Cost Per Lead Comparison</CardTitle>
        <CardDescription>
          See how our transparent, exclusivity-based pricing compares to Bark's credit system
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
                <th className="text-center p-4 font-semibold">Exclusive Leads</th>
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
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <X className="w-4 h-4 text-destructive" />
                    <span className="text-sm">Shared</span>
                  </div>
                </td>
                <td className="p-4 text-right text-muted-foreground">
                  Baseline
                </td>
              </tr>

              <tr className="border-b border-border bg-muted/30">
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    DigsandGigs
                    <Badge variant="secondary">Non-Exclusive</Badge>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="text-sm">Exclusivity-Based</div>
                  <div className="text-xs text-muted-foreground">
                    Bark - $0.50
                  </div>
                </td>
                <td className="p-4 text-center font-semibold text-lg text-primary">
                  ${digsAndGigsNonExclusive.toFixed(2)}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">$0</span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">24-Hour Window</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  {Number(savingsNonExclusive) > 0 ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      Save {savingsNonExclusive}%
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      +{Math.abs(Number(savingsNonExclusive))}%
                    </Badge>
                  )}
                </td>
              </tr>

              <tr className="border-b border-border bg-primary/5">
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    DigsandGigs
                    <Badge variant="secondary">24-Hour Exclusive</Badge>
                    <Badge variant="default">Premium</Badge>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="text-sm">Exclusivity-Based</div>
                  <div className="text-xs text-muted-foreground">
                    Google CPC × 2.5
                  </div>
                </td>
                <td className="p-4 text-center font-semibold text-lg text-primary">
                  ${digsAndGigsExclusive.toFixed(2)}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">$0</span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">24-Hour Exclusive</span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  {Number(savingsExclusive) > 0 ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                      Save {savingsExclusive}%
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      +{Math.abs(Number(savingsExclusive))}%
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
                  <span><strong>Exclusivity Choice:</strong> Choose between cost-effective non-exclusive or premium 24-hour exclusive leads</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Transparent Pricing:</strong> Bark - $0.50 for non-exclusive, Google CPC × 2.5 for exclusive</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Simple Model:</strong> One transparent price per lead, no complex credit calculations</span>
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
                    <span>DigsandGigs (Non-Exclusive):</span>
                    <span className="font-semibold">${(digsAndGigsNonExclusive * 25).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 border-t pt-2">
                    <span className="font-semibold">Your Savings:</span>
                    <span className="font-semibold">${(barkData.costPerLead * 25 - digsAndGigsNonExclusive * 25).toFixed(2)}</span>
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
