import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingDown, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { getAllIndustries, getLeadCostForIndustry } from "@/config/pricing";

export default function LeadCostTimeline() {
  const [selectedIndustry, setSelectedIndustry] = useState('HVAC');
  
  const freeTierCost = getLeadCostForIndustry(selectedIndustry, 'free');
  const proTierCost = getLeadCostForIndustry(selectedIndustry, 'pro');
  const premiumTierCost = getLeadCostForIndustry(selectedIndustry, 'premium');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Commitment-Based Pricing: Lock In Your Rate
        </CardTitle>
        <CardDescription>
          Choose your expected monthly lead volume and lock in your per-lead cost for the entire month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timeline-industry">Select Your Industry:</Label>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger id="timeline-industry">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAllIndustries().map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Commitment Tiers */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Choose Your Monthly Commitment:</h3>
          
          {/* Free Tier */}
          <div className="p-4 border-2 border-border rounded-lg bg-background hover:border-primary/50 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-bold text-lg">Free Tier</h4>
                <p className="text-sm text-muted-foreground">Expecting 1-10 leads per month</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">${freeTierCost}</div>
                <div className="text-xs text-muted-foreground">per lead</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Standard rate - Pay ${freeTierCost} for every lead you receive, regardless of quantity
            </p>
          </div>

          {/* Pro Tier */}
          <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 hover:border-primary transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-lg">Pro Tier</h4>
                  <Badge className="bg-green-500 text-white">Save 17%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Expecting 11-50 leads per month</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">${proTierCost}</div>
                <div className="text-xs text-muted-foreground">per lead</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Best bulk pricing - Pay only ${proTierCost} per lead for ALL leads that month (vs ${freeTierCost} standard rate)
            </p>
          </div>

          {/* Premium Tier */}
          <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 hover:border-primary transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-lg">Premium Tier</h4>
                  <Badge className="bg-green-600 text-white">Save 33%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Expecting 51+ leads per month</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">${premiumTierCost}</div>
                <div className="text-xs text-muted-foreground">per lead</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Maximum savings - Pay only ${premiumTierCost} per lead for ALL leads that month (vs ${freeTierCost} standard rate)
            </p>
          </div>
        </div>

        {/* Example Calculation */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h4 className="font-semibold text-sm">Example: Receiving 30 Leads in {selectedIndustry}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Free Tier Commitment (1-10 leads expected):</span>
              <span className="font-bold">30 × ${freeTierCost} = ${(30 * freeTierCost).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-medium">
              <span>Pro Tier Commitment (11-50 leads expected):</span>
              <span className="font-bold">30 × ${proTierCost} = ${(30 * proTierCost).toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Premium Tier Commitment (51+ leads expected):</span>
              <span className="font-bold">30 × ${premiumTierCost} = ${(30 * premiumTierCost).toFixed(0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-primary font-bold">
              <span>Savings with Pro vs Free:</span>
              <span>${((30 * freeTierCost) - (30 * proTierCost)).toFixed(0)} ({Math.round((1 - proTierCost/freeTierCost) * 100)}%)</span>
            </div>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important: Choose Wisely!</AlertTitle>
          <AlertDescription>
            Your tier selection determines your per-lead rate for the entire month. If you commit to Free Tier but receive 30 leads, you'll pay the Free Tier rate for all 30 leads. Consider your expected volume carefully.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
