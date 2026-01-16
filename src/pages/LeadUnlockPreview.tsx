import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { 
  Lock, 
  Unlock, 
  DollarSign, 
  Calendar, 
  MapPin, 
  FileText,
  CheckCircle,
  ArrowLeft,
  Percent,
  CreditCard
} from "lucide-react";
import { BidSubmissionTemplateDemo } from "@/components/BidSubmissionTemplateDemo";

type PricingOption = "pay_per_lead" | "success_based";

// Referral fee configuration
const REFERRAL_FEE_RATE = 0.025; // 2.5%
const REFERRAL_FEE_MIN = 100; // $100 minimum
const REFERRAL_FEE_CAP = 249; // $249 cap
const DEPOSIT_RATE = 0.05; // 5% deposit from Gigger when Digger accepts

// Sample lead data for demo
const sampleLead = {
  id: "demo-lead-001",
  title: "Build Custom CRM Dashboard",
  description: "We need a modern, responsive CRM dashboard built with React. The dashboard should include customer management, sales pipeline visualization, reporting analytics, and integration with our existing APIs. Looking for someone with strong frontend skills and experience with data visualization libraries like Recharts or D3.js.",
  requirements: "Experience with React, TypeScript, and data visualization. Must be able to integrate with REST APIs and handle real-time updates. Previous CRM or B2B SaaS experience preferred.",
  budget_min: 5000,
  budget_max: 10000,
  timeline: "2-4 weeks",
  location: "San Francisco, CA",
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  calculated_price_cents: 4900, // $49 (3% of $7,500 = $225, capped at $49)
};

export default function LeadUnlockPreview() {
  const [selectedPricing, setSelectedPricing] = useState<PricingOption>("pay_per_lead");
  const [showBidForm, setShowBidForm] = useState(false);
  const [viewAsGigger, setViewAsGigger] = useState(false);

  const formatBudget = (min: number | null, max: number | null): string => {
    if (!min && !max) return "Budget not specified";
    if (!max) return `$${min?.toLocaleString()}+`;
    if (!min) return `Up to $${max?.toLocaleString()}`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
  };

  const getLeadPrice = (): number => {
    if (sampleLead.calculated_price_cents) {
      return sampleLead.calculated_price_cents / 100;
    }
    const min = sampleLead.budget_min || 0;
    const max = sampleLead.budget_max || min;
    const avg = (min + max) / 2;
    const price = Math.round(avg * 0.03);
    return Math.min(49, Math.max(1, price));
  };

  const getEstimatedReferralFee = (): { min: number; max: number; midpoint: number } => {
    const min = sampleLead.budget_min || 0;
    const max = sampleLead.budget_max || min;
    const midpoint = (min + max) / 2;
    
    // 2.5% of midpoint, with $100 min and $249 cap
    const calcMidpointFee = midpoint * REFERRAL_FEE_RATE;
    const midpointFee = Math.max(REFERRAL_FEE_MIN, Math.min(calcMidpointFee, REFERRAL_FEE_CAP));
    
    const calcMinFee = min * REFERRAL_FEE_RATE;
    const calcMaxFee = max * REFERRAL_FEE_RATE;
    const minFee = Math.max(REFERRAL_FEE_MIN, Math.min(calcMinFee, REFERRAL_FEE_CAP));
    const maxFee = Math.max(REFERRAL_FEE_MIN, Math.min(calcMaxFee, REFERRAL_FEE_CAP));
    
    return { 
      min: Math.round(minFee), 
      max: Math.round(maxFee),
      midpoint: Math.round(midpointFee)
    };
  };
  
  // Calculate exclusive fee based on midpoint
  const exclusiveFee = getEstimatedReferralFee().midpoint;

  const handleUnlock = () => {
    toast.info("Demo Mode: This would redirect to Stripe checkout for payment", {
      description: `Lead unlock cost: $${getLeadPrice()}`
    });
  };

  const handleSuccessBasedBid = () => {
    setShowBidForm(true);
  };
  
  const handleBackToOptions = () => {
    setShowBidForm(false);
    setViewAsGigger(false);
  };

  const handleToggleGiggerView = () => {
    setViewAsGigger(!viewAsGigger);
  };

  const handleAcceptProposal = () => {
    toast.success("Proposal Accepted! (Demo)", {
      description: "Gigger charged 5% deposit. Digger notified and will pay 2.5% fee.",
    });
  };

  const handleAskQuestion = () => {
    toast.info("Question dialog would open here (Demo)");
  };

  const leadPrice = getLeadPrice();
  const estimatedFee = getEstimatedReferralFee();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Lead Unlock Preview | Digs & Gigs"
        description="Preview of what Diggers see when they receive a lead notification email."
      />
      
      <Navigation showBackButton backLabel="Back" />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Demo Banner */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
            <FileText className="w-5 h-5" />
            Preview Mode
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
            {showBidForm 
              ? "This is a demo of the Exclusive Bid Submission form."
              : "This is a demo of what Diggers see when they click a lead notification email link."}
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={showBidForm ? handleBackToOptions : () => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {showBidForm ? "Back to Lead Details" : "Back"}
        </Button>
        
        {/* Exclusive Bid Submission Form */}
        {showBidForm ? (
          <div className="space-y-6">
            {/* Lead Summary */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-orange-500">Exclusive Bid</Badge>
                  <Badge variant="outline">
                    {formatBudget(sampleLead.budget_min, sampleLead.budget_max)}
                  </Badge>
                </div>
                <CardTitle className="text-xl mt-2">{sampleLead.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {sampleLead.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {sampleLead.description}
                </p>
              </CardContent>
            </Card>

            {/* View Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border p-1 bg-muted/50">
                <Button
                  variant={!viewAsGigger ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewAsGigger(false)}
                >
                  Digger View (Submit)
                </Button>
                <Button
                  variant={viewAsGigger ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewAsGigger(true)}
                >
                  Gigger View (Review)
                </Button>
              </div>
            </div>
            
            {/* Bid Submission Form */}
            <BidSubmissionTemplateDemo 
              pricingModel="exclusive" 
              budgetMin={sampleLead.budget_min}
              budgetMax={sampleLead.budget_max}
              viewMode={viewAsGigger ? "gigger" : "digger"}
              onAcceptProposal={handleAcceptProposal}
              onAskQuestion={handleAskQuestion}
            />
          </div>
        ) : (
          /* Lead Details and Pricing Options */

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-sm">
                Posted 2 hours ago
              </Badge>
              <Badge variant="secondary">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            </div>
            <CardTitle className="text-2xl">{sampleLead.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4" />
              {sampleLead.location}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Project Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Project Description
                </h3>
                <p className="text-muted-foreground">{sampleLead.description}</p>
              </div>

              {sampleLead.requirements && (
                <div>
                  <h4 className="font-medium mb-1">Requirements</h4>
                  <p className="text-muted-foreground">{sampleLead.requirements}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Budget & Timeline */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold">Budget</div>
                  <div className="text-muted-foreground">
                    {formatBudget(sampleLead.budget_min, sampleLead.budget_max)}
                  </div>
                </div>
              </div>

              {sampleLead.timeline && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold">Timeline</div>
                    <div className="text-muted-foreground">{sampleLead.timeline}</div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Pricing Options */}
            <div className="space-y-6">
              <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
                <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Choose Your Engagement Type</h3>
                <p className="text-muted-foreground mb-6">
                  Select how you'd like to engage with this lead.
                </p>

                <RadioGroup
                  value={selectedPricing}
                  onValueChange={(value) => setSelectedPricing(value as PricingOption)}
                  className="grid gap-4"
                >
                  {/* Option 1: Non-Exclusive Access */}
                  <div className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    selectedPricing === "pay_per_lead" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}>
                    <Label 
                      htmlFor="pay_per_lead" 
                      className="flex items-start gap-4 cursor-pointer"
                    >
                      <RadioGroupItem value="pay_per_lead" id="pay_per_lead" className="mt-1" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-primary" />
                            <span className="font-semibold text-lg">Non-Exclusive Access</span>
                          </div>
                          <span className="text-2xl font-bold text-primary">${leadPrice}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Contact the client. Other professionals may also engage.
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Instant access to contact info</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3 h-3" />
                          <span>No additional fees</span>
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* Option 2: Exclusive (Pay on Award) */}
                  <div className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    selectedPricing === "success_based" 
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" 
                      : "border-border hover:border-orange-500/50"
                  }`}>
                    <Label 
                      htmlFor="success_based" 
                      className="flex items-start gap-4 cursor-pointer"
                    >
                      <RadioGroupItem value="success_based" id="success_based" className="mt-1" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Percent className="w-5 h-5 text-orange-500" />
                            <span className="font-semibold text-lg">Exclusive (Pay on Award)</span>
                          </div>
                          <span className="text-2xl font-bold text-orange-500">${exclusiveFee.toFixed(0)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          2.5% referral fee (${REFERRAL_FEE_MIN}–${REFERRAL_FEE_CAP}) when awarded. Gigger pays 5% deposit when you accept.
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Estimated fee if awarded: ${estimatedFee.min} – ${estimatedFee.max}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Exclusivity — no competition once awarded</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-orange-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Near-certainty of winning the project</span>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Action Button */}
              <div className="space-y-3">
                {selectedPricing === "pay_per_lead" ? (
                  <>
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={handleUnlock}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Unlock Lead — ${leadPrice}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Bogus leads are fully refundable. No questions asked.
                    </p>
                  </>
                ) : (
                  <>
                    <Button 
                      size="lg" 
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={handleSuccessBasedBid}
                    >
                      <Percent className="w-4 h-4 mr-2" />
                      Bid for Exclusive Award
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Submit your proposal. Pay only if awarded and you accept.
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
