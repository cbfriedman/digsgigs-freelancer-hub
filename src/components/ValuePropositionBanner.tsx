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
  GeographicTier, 
  IndustryType, 
  getSubscriptionTier 
} from "@/config/subscriptionTiers";
import { 
  ANGI_CPL_TIERS, 
  SUBSCRIBER_CPL_MULTIPLIER, 
  NON_SUBSCRIBER_CPL_MULTIPLIER 
} from "@/config/clickPricing";

export const ValuePropositionBanner = () => {
  const navigate = useNavigate();
  const [selectedGeoTier, setSelectedGeoTier] = useState<GeographicTier>('local');
  const [selectedIndustryType, setSelectedIndustryType] = useState<IndustryType>('lv_mv');

  // Calculate dynamic pricing
  const subscriptionTier = getSubscriptionTier(selectedGeoTier, selectedIndustryType);
  const monthlyPrice = subscriptionTier ? (subscriptionTier.monthly_price_cents / 100).toFixed(0) : '19';
  
  // Geographic tier multipliers: Statewide = 2x, Nationwide = 3x local pricing
  const geoMultiplier = selectedGeoTier === 'nationwide' ? 3 : selectedGeoTier === 'statewide' ? 2 : 1;
  
  const leadTier = selectedIndustryType === 'hv' ? 'high-value' : 'mid-value';
  const subLeadMin = Math.round(ANGI_CPL_TIERS[leadTier].min * SUBSCRIBER_CPL_MULTIPLIER * geoMultiplier);
  const subLeadMax = Math.round(ANGI_CPL_TIERS[leadTier].max * SUBSCRIBER_CPL_MULTIPLIER * geoMultiplier);
  const nonSubLeadMin = Math.round(ANGI_CPL_TIERS[leadTier].min * NON_SUBSCRIBER_CPL_MULTIPLIER * geoMultiplier);
  const nonSubLeadMax = Math.round(ANGI_CPL_TIERS[leadTier].max * NON_SUBSCRIBER_CPL_MULTIPLIER * geoMultiplier);

  const coverageLabel = selectedGeoTier === 'local' ? 'local area' : selectedGeoTier === 'statewide' ? 'entire state' : 'nationwide';
  const industryLabel = selectedIndustryType === 'hv' ? 'High-value' : 'Standard';

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
              Get discovered by homeowners in your{' '}
              <span className="font-bold text-foreground">{coverageLabel}</span>.{' '}
              {industryLabel} lead subscribers get{' '}
              <span className="font-bold text-foreground">2 free lead reveals monthly</span> plus{' '}
              <span className="font-bold text-foreground">${subLeadMin}-${subLeadMax}</span> per additional reveal.
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
              <Select value={selectedIndustryType} onValueChange={(v) => setSelectedIndustryType(v as IndustryType)}>
                <SelectTrigger className="w-[180px] bg-background border-primary/30 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="lv_mv">Standard Leads</SelectItem>
                  <SelectItem value="hv">High Value Leads</SelectItem>
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
                <div className="text-2xl font-bold text-primary">${subLeadMin}-${subLeadMax}</div>
              </div>
              <div className="text-sm text-muted-foreground">Per lead (subscribers)</div>
              <div className="text-xs text-muted-foreground mt-1">
                vs ${nonSubLeadMin}-${nonSubLeadMax} non-subscribers
              </div>
              <div className="text-xs text-primary/70 mt-2 font-medium">Save ~28% per lead</div>
            </div>

            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-6 border border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-600">2 Free</div>
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
