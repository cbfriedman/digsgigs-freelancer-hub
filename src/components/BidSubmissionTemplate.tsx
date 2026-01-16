import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, Percent, CreditCard, AlertCircle, DollarSign, Eye } from "lucide-react";
import { z } from "zod";
import { AnonymizedDiggerCard } from "./AnonymizedDiggerCard";

// SECURITY: Input validation schema
const bidSchema = z.object({
  amountMin: z.number()
    .positive("Minimum amount must be greater than 0")
    .max(1000000, "Amount must be less than $1,000,000"),
  amountMax: z.number()
    .positive("Maximum amount must be greater than 0")
    .max(1000000, "Amount must be less than $1,000,000"),
  timeline: z.string()
    .trim()
    .min(3, "Timeline must be at least 3 characters")
    .max(100, "Timeline must be less than 100 characters"),
  proposal: z.string()
    .trim()
    .min(50, "Proposal must be at least 50 characters")
    .max(5000, "Proposal must be less than 5000 characters"),
}).refine(data => data.amountMax >= data.amountMin, {
  message: "Maximum amount must be greater than or equal to minimum amount",
  path: ["amountMax"],
});

// Referral fee configuration - must match edge function
const REFERRAL_FEE_RATE = 0.025; // 2.5%
const REFERRAL_FEE_MIN = 100; // $100 minimum
const REFERRAL_FEE_CAP = 249; // $249 cap
const DEPOSIT_RATE = 0.05; // 5% deposit from Gigger when Digger accepts

interface DiggerProfile {
  id: string;
  profession?: string;
  years_experience?: number;
  average_rating?: number;
  total_ratings?: number;
  completion_rate?: number;
  response_time_hours?: number;
  verified?: boolean;
  is_insured?: boolean;
  is_bonded?: boolean;
  is_licensed?: string;
  skills?: string[];
  certifications?: string[];
  city?: string;
  state?: string;
  offers_free_estimates?: boolean;
}

interface BidSubmissionTemplateProps {
  gigId: string;
  diggerId: string;
  onSuccess: () => void;
  initialPricingModel?: "pay_per_lead" | "success_based";
}

export const BidSubmissionTemplate = ({ 
  gigId, 
  diggerId, 
  onSuccess, 
  initialPricingModel = "pay_per_lead" 
}: BidSubmissionTemplateProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [proposal, setProposal] = useState("");
  const [includesEscrowCost, setIncludesEscrowCost] = useState(false);
  const [pricingModel] = useState<"pay_per_lead" | "success_based">(initialPricingModel);
  const [diggerProfile, setDiggerProfile] = useState<DiggerProfile | null>(null);
  const [referenceCount, setReferenceCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch digger profile for preview
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('digger_profiles')
          .select(`
            id,
            profession,
            years_experience,
            average_rating,
            total_ratings,
            completion_rate,
            response_time_hours,
            verified,
            is_insured,
            is_bonded,
            is_licensed,
            skills,
            certifications,
            city,
            state,
            offers_free_estimates
          `)
          .eq('id', diggerId)
          .single();

        if (profileError) throw profileError;
        setDiggerProfile(profile);

        // Count references
        const { count } = await supabase
          .from('references')
          .select('*', { count: 'exact', head: true })
          .eq('digger_id', diggerId)
          .eq('is_verified', true);

        setReferenceCount(count || 0);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [diggerId]);

  const calculateReferralFee = (amount: number): number => {
    const fee = amount * REFERRAL_FEE_RATE;
    return Math.max(REFERRAL_FEE_MIN, Math.min(fee, REFERRAL_FEE_CAP));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amountMin || !amountMax || !timeline || !proposal) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const parsedMin = parseFloat(amountMin);
      const parsedMax = parseFloat(amountMax);
      
      // SECURITY: Validate inputs before submission
      const validated = bidSchema.parse({
        amountMin: parsedMin,
        amountMax: parsedMax,
        timeline: timeline,
        proposal: proposal,
      });

      // Calculate midpoint for the main amount field
      const midpointAmount = (validated.amountMin + validated.amountMax) / 2;

      const bidData: any = {
        gig_id: gigId,
        digger_id: diggerId,
        amount: midpointAmount,
        amount_min: validated.amountMin,
        amount_max: validated.amountMax,
        timeline: validated.timeline,
        proposal: validated.proposal,
        pricing_model: pricingModel,
      };

      // Add referral fee info for success-based bids
      if (pricingModel === "success_based") {
        bidData.referral_fee_rate = REFERRAL_FEE_RATE;
        bidData.referral_fee_cap_cents = REFERRAL_FEE_CAP * 100;
      }

      const { data: insertedBid, error } = await supabase
        .from('bids' as any)
        .insert(bidData)
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-bid-notification', {
          body: {
            type: 'submitted',
            bidId: (insertedBid as any)?.id,
            gigId,
            diggerId,
            amount: midpointAmount,
            amountMin: validated.amountMin,
            amountMax: validated.amountMax,
            timeline: validated.timeline,
            pricingModel,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      toast({
        title: "Proposal submitted!",
        description: pricingModel === "success_based"
          ? "Your proposal has been submitted. A 2% referral fee will be charged only if you're selected."
          : "Your proposal has been submitted successfully.",
      });

      // Track custom event
      const win = window as any;
      if (win.fbq) {
        try {
          win.fbq('trackCustom', 'SubmitBid', {
            bid_id: (insertedBid as any)?.id,
            gig_id: gigId,
            digger_id: diggerId,
            amount_min: validated.amountMin,
            amount_max: validated.amountMax,
            currency: 'USD',
            pricing_model: pricingModel,
          });
        } catch (error) {
          console.warn('Facebook Pixel: Error tracking SubmitBid event', error);
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit proposal",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const parsedMin = parseFloat(amountMin) || 0;
  const parsedMax = parseFloat(amountMax) || 0;
  const estimatedFeeMin = calculateReferralFee(parsedMin);
  const estimatedFeeMax = calculateReferralFee(parsedMax);

  if (loadingProfile) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Submit Your Proposal</CardTitle>
              <CardDescription>
                Provide a cost range and proposal for this project
              </CardDescription>
            </div>
            {pricingModel === "success_based" ? (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Percent className="w-3 h-3 mr-1" />
                Exclusive (Pay on Award)
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CreditCard className="w-3 h-3 mr-1" />
                Non-Exclusive
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pricingModel === "success_based" && (
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                    Exclusive Engagement Selected
                  </p>
                  <p className="text-orange-700 dark:text-orange-300">
                    You pay nothing upfront. A one-time 2% referral fee (${REFERRAL_FEE_MIN}–${REFERRAL_FEE_CAP}) 
                    will be charged only if you're awarded and accept the job.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cost Range */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Cost Proposal Range
              </Label>
              <p className="text-sm text-muted-foreground">
                Provide a realistic price range for this project. Final price can be refined after discussion with the client.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amountMin" className="text-sm">Minimum ($)</Label>
                  <Input
                    id="amountMin"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1,000"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountMax" className="text-sm">Maximum ($)</Label>
                  <Input
                    id="amountMax"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2,500"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    required
                  />
                </div>
              </div>
              {pricingModel === "success_based" && parsedMin > 0 && parsedMax > 0 && (
                <p className="text-xs text-muted-foreground">
                  Referral fee if selected: ${estimatedFeeMin.toFixed(2)} – ${estimatedFeeMax.toFixed(2)}
                  {(estimatedFeeMin >= REFERRAL_FEE_CAP || estimatedFeeMax >= REFERRAL_FEE_CAP) && " (capped at $249)"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline">Estimated Timeline</Label>
              <Input
                id="timeline"
                placeholder="e.g., 2-3 weeks, 1 month"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposal">Your Proposal (minimum 50 characters)</Label>
              <Textarea
                id="proposal"
                placeholder="Describe your approach to this project, relevant experience, and why you're the best fit. Include any assumptions that might affect the final price..."
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={8}
                required
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground">
                {proposal.length}/5000 characters
              </p>
            </div>

            {pricingModel === "pay_per_lead" && (
              <div className="space-y-3 pt-2 pb-2">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="includesEscrowCost"
                    checked={includesEscrowCost}
                    onCheckedChange={(checked) => setIncludesEscrowCost(checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="includesEscrowCost" className="cursor-pointer leading-relaxed">
                      My proposal includes escrow costs (if applicable)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Info className="inline-block h-3 w-3 mr-1" />
                      If the client requests escrow protection, an 8% fee will apply. Check this if you've added that cost to your price range.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Preview Toggle */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Hide Preview" : "Preview How Client Sees You"}
              </Button>
            </div>

            {/* Preview of Anonymized Profile */}
            {showPreview && diggerProfile && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  This is how your proposal will appear to the client (your identity is hidden):
                </p>
                <AnonymizedDiggerCard
                  bidderNumber={1}
                  profession={diggerProfile.profession}
                  yearsExperience={diggerProfile.years_experience}
                  averageRating={diggerProfile.average_rating}
                  totalRatings={diggerProfile.total_ratings}
                  completionRate={diggerProfile.completion_rate}
                  responseTimeHours={diggerProfile.response_time_hours}
                  isVerified={diggerProfile.verified}
                  isInsured={diggerProfile.is_insured}
                  isBonded={diggerProfile.is_bonded}
                  isLicensed={diggerProfile.is_licensed}
                  skills={diggerProfile.skills}
                  certifications={diggerProfile.certifications}
                  referenceCount={referenceCount}
                  city={diggerProfile.city}
                  state={diggerProfile.state}
                  offersFreeBEstimates={diggerProfile.offers_free_estimates}
                />
                
                {/* Sample Cost Display */}
                {parsedMin > 0 && parsedMax > 0 && (
                  <div className="p-4 bg-accent/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Proposed Cost Range:</span>
                      <span className="text-xl font-bold text-primary">
                        ${parsedMin.toLocaleString()} – ${parsedMax.toLocaleString()}
                      </span>
                    </div>
                    {timeline && (
                      <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                        <span>Timeline:</span>
                        <span>{timeline}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Proposal...
                </>
              ) : (
                'Submit Proposal'
              )}
            </Button>

            {pricingModel === "success_based" && (
              <p className="text-xs text-center text-muted-foreground">
                By submitting, you agree to pay a 2% referral fee (${REFERRAL_FEE_MIN}–${REFERRAL_FEE_CAP}) if you're awarded and accept this job.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
