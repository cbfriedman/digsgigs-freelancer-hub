import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  ArrowRight,
  Gift
} from "lucide-react";
import { 
  GeographicTier
} from "@/config/subscriptionTiers";
import { 
  LEAD_REVEAL_PRICING,
  GEOGRAPHIC_MULTIPLIERS,
  FREE_LEADS_PER_MONTH
} from "@/config/clickPricing";

// Lead type options combining industry and confirmation status
type LeadTypeOption = 'standard-unconfirmed' | 'standard-confirmed' | 'hv-unconfirmed' | 'hv-confirmed';

const LEAD_TYPE_LABELS: Record<LeadTypeOption, string> = {
  'standard-unconfirmed': 'Standard (Unconfirmed)',
  'standard-confirmed': 'Standard (Confirmed)',
  'hv-unconfirmed': 'High-Value (Unconfirmed)',
  'hv-confirmed': 'High-Value (Confirmed)',
};

// Subscription pricing (same for all industries)
const SUBSCRIPTION_PRICES: Record<GeographicTier, number> = {
  local: 29,
  statewide: 59,
  nationwide: 299,
};

export const ValuePropositionBanner = () => {
  const navigate = useNavigate();
  const [selectedGeoTier, setSelectedGeoTier] = useState<GeographicTier>('local');
  const [selectedLeadType, setSelectedLeadType] = useState<LeadTypeOption>('standard-unconfirmed');

  // Parse the lead type into industry and confirmation status
  const isHighValue = selectedLeadType.startsWith('hv-');
  const isConfirmed = selectedLeadType.endsWith('-confirmed');
  const industryKey = isHighValue ? 'highValue' : 'standard';
  const confirmationKey = isConfirmed ? 'confirmed' : 'unconfirmed';

  // Get subscription price (same for all industries)
  const monthlyPrice = SUBSCRIPTION_PRICES[selectedGeoTier];

  // Get per-lead price from the pricing matrix
  const perLeadPrice = LEAD_REVEAL_PRICING[industryKey][confirmationKey][selectedGeoTier];

  // Non-subscriber pays 38% more (legacy calculation for comparison)
  const nonSubLeadPrice = Math.round(perLeadPrice * 1.38);

  const coverageLabel = selectedGeoTier === 'local' ? 'local area' : selectedGeoTier === 'statewide' ? 'entire state' : 'nationwide';
  const industryLabel = isHighValue ? 'High-value' : 'Standard';
  const confirmationLabel = isConfirmed ? 'confirmed' : 'unconfirmed';

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-y border-primary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Main Headline */}
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-base px-4 py-1">
              ✨ Simple, Predictable Pricing
            </Badge>
            <h3 className="text-4xl lg:text-5xl font-bold mb-4">
              Subscribe for Visibility. <span className="text-primary">Pay Less Per Lead.</span>
            </h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get discovered by consumers in your{' '}
              <span className="font-bold text-foreground">{coverageLabel}</span>.{' '}
              {industryLabel} {confirmationLabel} lead subscribers get{' '}
              <span className="font-bold text-foreground">{FREE_LEADS_PER_MONTH} free lead reveals monthly</span> plus{' '}
              <span className="font-bold text-foreground">${perLeadPrice.toFixed(2)}</span> per additional reveal.
            </p>
          </div>

          {/* Tier Selection Dropdowns */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Coverage Area:</span>
              <Select value={selectedGeoTier} onValueChange={(v) => setSelectedGeoTier(v as GeographicTier)}>
                <SelectTrigger className="w-[160px] bg-background border-primary/30 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="statewide">Statewide</SelectItem>
                  <SelectItem value="nationwide">Nationwide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Lead Type:</span>
              <Select value={selectedLeadType} onValueChange={(v) => setSelectedLeadType(v as LeadTypeOption)}>
                <SelectTrigger className="w-[220px] bg-background border-primary/30 font-medium">
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

          {/* Stats Grid - Dynamic based on selections */}
          <div className="grid md:grid-cols-4 gap-6 mb-10">
            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-6 border border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary">${monthlyPrice}</div>
              </div>
              <div className="text-sm text-muted-foreground">Monthly subscription</div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedGeoTier === 'local' ? 'Local' : selectedGeoTier === 'statewide' ? 'Statewide' : 'Nationwide'} coverage
              </div>
            </div>

            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-6 border border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">${perLeadPrice.toFixed(2)}</div>
              </div>
              <div className="text-sm text-muted-foreground">Per lead (subscribers)</div>
              <div className="text-xs text-muted-foreground mt-1">
                vs ${nonSubLeadPrice} non-subscribers
              </div>
              <div className="text-xs text-primary/70 mt-2 font-medium">
                {isConfirmed && <span className="text-amber-600">+50% confirmed premium</span>}
                {!isConfirmed && <span>Save ~28% per lead</span>}
              </div>
            </div>

            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-6 border border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-600">{FREE_LEADS_PER_MONTH} Free</div>
              </div>
              <div className="text-sm text-muted-foreground">Lead reveals per month</div>
              <div className="text-xs text-muted-foreground mt-1">Accumulates while subscribed</div>
            </div>

            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-6 border border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold text-primary">12-Month</div>
              </div>
              <div className="text-sm text-muted-foreground">Price lock guarantee</div>
              <div className="text-xs text-muted-foreground mt-1">Your rate is protected</div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button 
              variant="hero" 
              size="lg" 
              className="text-lg px-8"
              onClick={() => navigate("/pricing")}
            >
              View All Pricing Plans <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Join 10,000+ service professionals growing with DigsAndGigs
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
