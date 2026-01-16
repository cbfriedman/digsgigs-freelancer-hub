import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, FileText, Eye, Info } from "lucide-react";
import { AnonymizedDiggerCard } from "./AnonymizedDiggerCard";
import { toast } from "sonner";

interface BidSubmissionTemplateDemoProps {
  pricingModel: "non_exclusive" | "exclusive";
  budgetMin?: number;
  budgetMax?: number;
}

// Referral fee configuration
const REFERRAL_FEE_RATE = 0.025; // 2.5%
const REFERRAL_FEE_MIN = 100; // $100 minimum
const REFERRAL_FEE_CAP = 249; // $249 cap

const sampleDiggerProfile = {
  profession: "Full-Stack Developer",
  years_experience: 8,
  average_rating: 4.8,
  total_ratings: 47,
  completion_rate: 96,
  response_time_hours: 2,
  verified: true,
  is_insured: true,
  is_bonded: false,
  is_licensed: "CA-123456",
  skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker"],
  certifications: ["AWS Certified Developer", "Google Cloud Professional"],
  city: "San Francisco",
  state: "CA",
  offers_free_estimates: true,
};

export function BidSubmissionTemplateDemo({ pricingModel, budgetMin, budgetMax }: BidSubmissionTemplateDemoProps) {
  const [amountMin, setAmountMin] = useState(budgetMin ? String(budgetMin) : "2500");
  const [amountMax, setAmountMax] = useState(budgetMax ? String(budgetMax) : "4000");
  const [timeline, setTimeline] = useState("2-3 weeks");
  const [proposal, setProposal] = useState(
    "I have extensive experience building similar applications and can deliver a high-quality solution within your timeline. My approach includes thorough planning, regular communication, and comprehensive testing."
  );
  const [showPreview, setShowPreview] = useState(false);

  const calculateReferralFee = (amount: number) => {
    const fee = amount * REFERRAL_FEE_RATE;
    return Math.min(Math.max(fee, REFERRAL_FEE_MIN), REFERRAL_FEE_CAP);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Demo Mode", {
      description: "This is a preview - submission is disabled in demo mode.",
    });
  };

  const minAmount = parseFloat(amountMin) || 0;
  const maxAmount = parseFloat(amountMax) || 0;
  const minFee = calculateReferralFee(minAmount);
  const maxFee = calculateReferralFee(maxAmount);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Submit Your Proposal
          <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
            Demo Mode
          </Badge>
        </CardTitle>
        <CardDescription>
          Provide your cost estimate and proposal for this project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cost Range */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Range
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amountMin" className="text-xs text-muted-foreground">
                  Minimum
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="amountMin"
                    type="number"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    className="pl-7"
                    placeholder="1,000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="amountMax" className="text-xs text-muted-foreground">
                  Maximum
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="amountMax"
                    type="number"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    className="pl-7"
                    placeholder="5,000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Referral Fee Info (Exclusive only) */}
          {pricingModel === "exclusive" && minAmount > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-orange-700 dark:text-orange-400">Referral Fee (2.5%)</p>
                  <p className="text-sm text-muted-foreground">
                    If awarded and you accept, you'll pay a referral fee of{" "}
                    <span className="font-semibold text-foreground">
                      ${minFee.toFixed(0)} – ${maxFee.toFixed(0)}
                    </span>{" "}
                    based on the midpoint of your bid range.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fee range: ${REFERRAL_FEE_MIN} minimum – ${REFERRAL_FEE_CAP} cap
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                    Gigger pays 5% deposit when you accept the award.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <Label htmlFor="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estimated Timeline
            </Label>
            <Input
              id="timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g., 2-3 weeks, 1 month"
            />
          </div>

          {/* Proposal */}
          <div className="space-y-2">
            <Label htmlFor="proposal" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Your Proposal
            </Label>
            <Textarea
              id="proposal"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder="Describe your approach, experience, and why you're the best fit..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground text-right">
              {proposal.length} characters (minimum 50)
            </p>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Preview How Client Sees You</p>
                <p className="text-xs text-muted-foreground">
                  See your anonymized profile as it appears to Giggers
                </p>
              </div>
            </div>
            <Switch checked={showPreview} onCheckedChange={setShowPreview} />
          </div>

          {/* Anonymized Preview */}
          {showPreview && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm font-medium mb-3 text-muted-foreground">
                Client's View (Your identity is hidden):
              </p>
              <AnonymizedDiggerCard
                bidderNumber={1}
                profession={sampleDiggerProfile.profession}
                yearsExperience={sampleDiggerProfile.years_experience}
                averageRating={sampleDiggerProfile.average_rating}
                totalRatings={sampleDiggerProfile.total_ratings}
                completionRate={sampleDiggerProfile.completion_rate}
                responseTimeHours={sampleDiggerProfile.response_time_hours}
                isVerified={sampleDiggerProfile.verified}
                isInsured={sampleDiggerProfile.is_insured}
                isBonded={sampleDiggerProfile.is_bonded}
                isLicensed={sampleDiggerProfile.is_licensed}
                skills={sampleDiggerProfile.skills}
                certifications={sampleDiggerProfile.certifications}
                city={sampleDiggerProfile.city}
                state={sampleDiggerProfile.state}
                offersFreeBEstimates={sampleDiggerProfile.offers_free_estimates}
                referenceCount={12}
              />
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg">
            Submit Proposal (Demo)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
