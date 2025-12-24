import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Info } from "lucide-react";
import { 
  LEAD_REVEAL_PRICING,
  FREE_LEADS_PER_MONTH
} from "@/config/clickPricing";
import { GeographicTier } from "@/config/subscriptionTiers";

// Lead type options combining industry and confirmation status
type LeadTypeOption = 'standard-unconfirmed' | 'standard-confirmed' | 'hv-unconfirmed' | 'hv-confirmed';

const LEAD_TYPE_LABELS: Record<LeadTypeOption, string> = {
  'standard-unconfirmed': 'Standard (Unconfirmed)',
  'standard-confirmed': 'Standard (Confirmed)',
  'hv-unconfirmed': 'High-Value (Unconfirmed)',
  'hv-confirmed': 'High-Value (Confirmed)',
};

const LEAD_TYPE_DESCRIPTIONS: Record<LeadTypeOption, string> = {
  'standard-unconfirmed': 'Most service industries - lead has not confirmed intent',
  'standard-confirmed': 'Most service industries - lead confirmed they want quotes',
  'hv-unconfirmed': 'Legal, medical, financial, real estate - lead has not confirmed intent',
  'hv-confirmed': 'Legal, medical, financial, real estate - lead confirmed they want quotes',
};

export const LeadCostCalculator = () => {
  const [selectedGeoTier, setSelectedGeoTier] = useState<GeographicTier>('local');
  const [selectedLeadType, setSelectedLeadType] = useState<LeadTypeOption>('standard-unconfirmed');

  // Parse the lead type into industry and confirmation status
  const isHighValue = selectedLeadType.startsWith('hv-');
  const isConfirmed = selectedLeadType.endsWith('-confirmed');
  const industryKey = isHighValue ? 'highValue' : 'standard';
  const confirmationKey = isConfirmed ? 'confirmed' : 'unconfirmed';

  // Get per-lead price from the pricing matrix
  const subscriberPrice = LEAD_REVEAL_PRICING[industryKey][confirmationKey][selectedGeoTier];
  
  // Non-subscriber pays 38% more
  const nonSubscriberPrice = Math.round(subscriberPrice * 1.38 * 100) / 100;

  // Calculate savings
  const savingsPercent = Math.round((1 - subscriberPrice / nonSubscriberPrice) * 100);

  return (
    <div className="space-y-6">
      {/* Dropdowns */}
      <div className="flex flex-wrap justify-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Coverage Area:</span>
          <Select value={selectedGeoTier} onValueChange={(v) => setSelectedGeoTier(v as GeographicTier)}>
            <SelectTrigger className="w-[160px] bg-background border-primary/30 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="local">Local (≤50 mi)</SelectItem>
              <SelectItem value="statewide">Statewide</SelectItem>
              <SelectItem value="nationwide">Nationwide</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Lead Type:</span>
          <Select value={selectedLeadType} onValueChange={(v) => setSelectedLeadType(v as LeadTypeOption)}>
            <SelectTrigger className="w-[240px] bg-background border-primary/30 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="standard-unconfirmed">{LEAD_TYPE_LABELS['standard-unconfirmed']}</SelectItem>
              <SelectItem value="standard-confirmed">{LEAD_TYPE_LABELS['standard-confirmed']}</SelectItem>
              <SelectItem value="hv-unconfirmed">{LEAD_TYPE_LABELS['hv-unconfirmed']}</SelectItem>
              <SelectItem value="hv-confirmed">{LEAD_TYPE_LABELS['hv-confirmed']}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lead Type Description */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Info className="h-4 w-4" />
          {LEAD_TYPE_DESCRIPTIONS[selectedLeadType]}
        </p>
      </div>

      {/* Pricing Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Subscriber Pricing */}
        <Card className="border-primary relative overflow-hidden">
          <div className="absolute top-0 right-0">
            <Badge className="rounded-tl-none rounded-br-none bg-primary text-primary-foreground">
              Subscriber
            </Badge>
          </div>
          <CardContent className="pt-10 pb-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              ${subscriberPrice.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mb-4">per lead reveal</p>
            
            <div className="space-y-2 text-left text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{FREE_LEADS_PER_MONTH} free leads/month</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Free leads accumulate</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-600 font-medium">Save ~{savingsPercent}% per lead</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Non-Subscriber Pricing */}
        <Card className="border-border">
          <div className="absolute top-0 right-0">
            <Badge variant="outline" className="rounded-tl-none rounded-br-none">
              Pay-as-you-go
            </Badge>
          </div>
          <CardContent className="pt-10 pb-6 text-center">
            <div className="text-4xl font-bold text-muted-foreground mb-2">
              ${nonSubscriberPrice.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mb-4">per lead reveal</p>
            
            <div className="space-y-2 text-left text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 flex-shrink-0">•</span>
                <span>No subscription required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 flex-shrink-0">•</span>
                <span>No free monthly leads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 flex-shrink-0">•</span>
                <span>Pay full price per lead</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Matrix Summary */}
      <div className="mt-8 p-6 bg-muted/50 rounded-lg">
        <h4 className="font-semibold text-center mb-4">Complete Lead Pricing Matrix (Subscriber Rates)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Lead Type</th>
                <th className="text-center py-2 px-3">Local</th>
                <th className="text-center py-2 px-3">Statewide</th>
                <th className="text-center py-2 px-3">Nationwide</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">Standard (Unconfirmed)</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.standard.unconfirmed.local.toFixed(2)}</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.standard.unconfirmed.statewide.toFixed(2)}</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.standard.unconfirmed.nationwide.toFixed(2)}</td>
              </tr>
              <tr className="border-b bg-amber-50 dark:bg-amber-950/20">
                <td className="py-2 px-3 font-medium">Standard (Confirmed) <Badge variant="secondary" className="ml-1 text-xs">+50%</Badge></td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.standard.confirmed.local.toFixed(2)}</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.standard.confirmed.statewide.toFixed(2)}</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.standard.confirmed.nationwide.toFixed(2)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">High-Value (Unconfirmed)</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.highValue.unconfirmed.local.toFixed(2)}</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.highValue.unconfirmed.statewide.toFixed(2)}</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.highValue.unconfirmed.nationwide.toFixed(2)}</td>
              </tr>
              <tr className="bg-amber-50 dark:bg-amber-950/20">
                <td className="py-2 px-3 font-medium">High-Value (Confirmed) <Badge variant="secondary" className="ml-1 text-xs">+50%</Badge></td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.highValue.confirmed.local.toFixed(2)}</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.highValue.confirmed.statewide.toFixed(2)}</td>
                <td className="text-center py-2 px-3">${LEAD_REVEAL_PRICING.highValue.confirmed.nationwide.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Confirmed leads have verified intent and typically convert at higher rates. Non-subscribers pay ~38% more.
        </p>
      </div>
    </div>
  );
};
