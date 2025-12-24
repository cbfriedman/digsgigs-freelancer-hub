import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, AlertCircle, Info, Phone } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { IndustryMultiSelector } from "@/components/IndustryMultiSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_PRICING, getLeadCostForIndustry, IndustryCategory } from "@/config/pricing";
import { isHighValueIndustry, PROFILE_DISCOVERY_PRICING } from "@/config/clickPricing";

const diggerSchema = z.object({
  companyName: z.string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
});

interface DiggerRoleFormProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

const DiggerRoleForm = ({ onComplete, onBack }: DiggerRoleFormProps) => {
  const [companyName, setCompanyName] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [showTierWarning, setShowTierWarning] = useState(false);
  const [allowGiggerContact, setAllowGiggerContact] = useState(false);

  // Determine if any selected industry is high-value
  const hasHighValueIndustry = selectedIndustries.some(industry => isHighValueIndustry(industry));

  // Detect keyword tiers from selected industries
  const detectKeywordTiers = () => {
    const tierGroups: { [key: string]: { industries: string[], cost: number } } = {
      'low': { industries: [], cost: 0 },
      'mid': { industries: [], cost: 0 },
      'high': { industries: [], cost: 0 },
    };

    selectedIndustries.forEach(industry => {
      const pricing = INDUSTRY_PRICING.find(p => p.industries.includes(industry));
      if (pricing) {
        const cost = pricing['non-exclusive'];
        
        if (pricing.category === 'low-value') {
          tierGroups.low.industries.push(industry);
          tierGroups.low.cost = Math.max(tierGroups.low.cost, cost);
        } else if (pricing.category === 'mid-value') {
          tierGroups.mid.industries.push(industry);
          tierGroups.mid.cost = Math.max(tierGroups.mid.cost, cost);
        } else if (pricing.category === 'high-value') {
          tierGroups.high.industries.push(industry);
          tierGroups.high.cost = Math.max(tierGroups.high.cost, cost);
        }
      }
    });

    return Object.entries(tierGroups)
      .filter(([_, data]) => data.industries.length > 0)
      .map(([tier, data]) => ({ tier, ...data }));
  };

  const handleIndustriesChange = (industries: string[]) => {
    setSelectedIndustries(industries);
    
    // Check for multiple tiers
    const tiers = detectKeywordTiers();
    setShowTierWarning(tiers.length > 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      diggerSchema.parse({ companyName });

      // Optional: Can proceed without industries selected (incomplete profile)
      onComplete({
        companyName,
        selectedIndustries,
        allowGiggerContact,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Please fill in all required fields correctly");
      }
    }
  };

  const tiers = detectKeywordTiers();
  const highestCost = Math.max(...tiers.map(t => t.cost), 0);

  // Get Profile Discovery pricing based on industry type
  const profileDiscoveryPricing = hasHighValueIndustry 
    ? PROFILE_DISCOVERY_PRICING.highValue 
    : PROFILE_DISCOVERY_PRICING.standard;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">Company/Business Name *</Label>
        <Input
          id="companyName"
          type="text"
          placeholder="Your Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label>Select Your Services/Professions</Label>
        <p className="text-xs text-muted-foreground">
          Choose the industries and services you provide. You can skip this now and add them later.
        </p>
        <IndustryMultiSelector
          selectedIndustries={selectedIndustries}
          onIndustriesChange={handleIndustriesChange}
        />
      </div>

      {/* Allow Giggers to Contact Me Opt-in */}
      <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Checkbox
            id="allowGiggerContact"
            checked={allowGiggerContact}
            onCheckedChange={(checked) => setAllowGiggerContact(checked as boolean)}
          />
          <div className="space-y-1">
            <Label htmlFor="allowGiggerContact" className="font-medium cursor-pointer">
              I'd like Giggers to contact me
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow homeowners to discover and contact you directly from our marketplace
            </p>
          </div>
        </div>
        
        {allowGiggerContact && (
          <Alert className="mt-3">
            <Phone className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Profile Discovery Costs:</p>
              <p className="text-sm mb-2">
                When a Gigger clicks to reveal your contact info, you pay:
              </p>
              
              <ul className="text-sm space-y-1 mb-2">
                <li className="flex justify-between">
                  <span>• Local (≤50 miles):</span>
                  <strong>${profileDiscoveryPricing.local.toFixed(2)}</strong>
                </li>
                <li className="flex justify-between">
                  <span>• Statewide:</span>
                  <strong>${profileDiscoveryPricing.statewide.toFixed(2)}</strong>
                </li>
                <li className="flex justify-between">
                  <span>• Nationwide:</span>
                  <strong>${profileDiscoveryPricing.nationwide.toFixed(2)}</strong>
                </li>
              </ul>
              
              {hasHighValueIndustry && (
                <Badge variant="secondary" className="mb-2 bg-amber-500/10 text-amber-600 border-amber-500/30">
                  High-Value Industry Pricing
                </Badge>
              )}
              
              <p className="text-xs text-muted-foreground">
                💡 You'll receive an email with the Gigger's contact info when they request it
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Smart Tier Detection Warning */}
      {showTierWarning && tiers.length > 1 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold">💡 Cost Optimization Tip</p>
              <p className="text-sm">
                You've selected services from different pricing tiers. With a single profile, 
                your lead cost will default to the <strong>highest tier: ${highestCost}/lead</strong>.
              </p>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Detected Tiers:</p>
                {tiers.map(({ tier, industries, cost }) => (
                  <Card key={tier} className="bg-muted/50">
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={tier === 'high' ? 'default' : tier === 'mid' ? 'secondary' : 'outline'}>
                          {tier.toUpperCase()}-VALUE
                        </Badge>
                        <span className="text-sm font-semibold">${cost}/lead</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {industries.slice(0, 3).join(", ")}
                        {industries.length > 3 && ` +${industries.length - 3} more`}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                <p className="text-sm font-medium">✨ Recommended: Create Separate Profiles</p>
                <p className="text-xs text-muted-foreground mt-1">
                  After registration, create additional profiles for each tier to optimize your lead costs. 
                  You can manage multiple profiles from your dashboard.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {selectedIndustries.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You can skip industry selection for now, but you'll need to complete this before purchasing leads.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="flex-1">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default DiggerRoleForm;
