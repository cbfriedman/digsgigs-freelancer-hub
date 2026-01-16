import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DollarSign, Clock, FileText, Eye, Info, MessageCircle, CheckCircle } from "lucide-react";
import { AnonymizedDiggerCard } from "./AnonymizedDiggerCard";
import { toast } from "sonner";

interface BidSubmissionTemplateDemoProps {
  pricingModel: "non_exclusive" | "exclusive";
  budgetMin?: number;
  budgetMax?: number;
  viewMode?: "digger" | "gigger"; // digger = submitting bid, gigger = reviewing bid
  onAcceptProposal?: () => void;
  onAskQuestion?: () => void;
}

// Referral fee configuration - must match edge function
const REFERRAL_FEE_RATE = 0.03; // 3% for exclusive
const REFERRAL_FEE_MIN = 10; // $10 minimum
const REFERRAL_FEE_CAP = 249; // $249 cap
// Non-exclusive pricing for deposit calculation
const NON_EXCLUSIVE_RATE = 0.02; // 2%
const NON_EXCLUSIVE_MIN = 3; // $3 minimum
const NON_EXCLUSIVE_MAX = 49; // $49 maximum
// Deposit: higher of (5% + non-exclusive cost) or $249
const DEPOSIT_BASE_RATE = 0.05; // 5% base
const DEPOSIT_MIN = 249; // $249 minimum deposit

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

export function BidSubmissionTemplateDemo({ 
  pricingModel, 
  budgetMin, 
  budgetMax, 
  viewMode = "digger",
  onAcceptProposal,
  onAskQuestion 
}: BidSubmissionTemplateDemoProps) {
  const effectiveBudgetMin = budgetMin || 5000;
  const effectiveBudgetMax = budgetMax || 10000;
  
  // Calculate max allowed for Digger's high estimate (20% above their low estimate)
  const [amountMin, setAmountMin] = useState(String(effectiveBudgetMin));
  const maxAllowed = Math.round(parseFloat(amountMin) * 1.2);
  const [amountMax, setAmountMax] = useState(String(Math.min(maxAllowed, effectiveBudgetMax)));
  const [pricingType, setPricingType] = useState<"range" | "fixed">("range");
  const [fixedPrice, setFixedPrice] = useState(String(Math.round((effectiveBudgetMin + effectiveBudgetMax) / 2)));
  const [timeline, setTimeline] = useState("2-3 weeks");
  const [proposal, setProposal] = useState(
    "I have extensive experience building similar applications and can deliver a high-quality solution within your timeline. My approach includes thorough planning, regular communication, and comprehensive testing."
  );
  const [showPreview, setShowPreview] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");

  // Calculate referral fee based on range average (not fixed price)
  const calculateReferralFee = () => {
    const rangeAverage = (parseFloat(amountMin) + parseFloat(amountMax)) / 2;
    const fee = rangeAverage * REFERRAL_FEE_RATE;
    return Math.min(Math.max(fee, REFERRAL_FEE_MIN), REFERRAL_FEE_CAP);
  };

  // Calculate non-exclusive lead cost for deposit formula
  const calculateNonExclusiveCost = (amount: number): number => {
    const percentageCost = amount * NON_EXCLUSIVE_RATE;
    return Math.min(NON_EXCLUSIVE_MAX, Math.max(NON_EXCLUSIVE_MIN, percentageCost));
  };

  // Calculate Gigger deposit: higher of (5% + non-exclusive cost) or $249
  const calculateGiggerDeposit = (amount: number): number => {
    const nonExclusiveCost = calculateNonExclusiveCost(amount);
    const percentageDeposit = (amount * DEPOSIT_BASE_RATE) + nonExclusiveCost;
    return Math.max(DEPOSIT_MIN, percentageDeposit);
  };

  // Update max when min changes (enforce 20% constraint)
  const handleMinChange = (value: string) => {
    setAmountMin(value);
    const newMin = parseFloat(value) || 0;
    const newMaxAllowed = Math.round(newMin * 1.2);
    if (parseFloat(amountMax) > newMaxAllowed) {
      setAmountMax(String(newMaxAllowed));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Demo Mode", {
      description: "This is a preview - submission is disabled in demo mode.",
    });
  };

  const handleAcceptProposal = () => {
    const rangeAverage = (parseFloat(amountMin) + parseFloat(amountMax)) / 2;
    const giggerDeposit = calculateGiggerDeposit(rangeAverage);
    const diggerFee = calculateReferralFee();
    
    toast.success("Proposal Accepted! (Demo)", {
      description: `Gigger deposit: $${giggerDeposit.toFixed(0)} (higher of 5%+lead cost or $249). Digger pays 3% fee ($${diggerFee.toFixed(0)}).`,
    });
    onAcceptProposal?.();
  };

  const handleAskQuestion = () => {
    if (clarificationQuestion.trim()) {
      toast.info("Question Sent (Demo)", {
        description: "Your question has been sent to the Digger anonymously.",
      });
      setClarificationQuestion("");
    }
    onAskQuestion?.();
  };

  const minAmount = parseFloat(amountMin) || 0;
  const maxAmount = parseFloat(amountMax) || 0;
  const rangeAverage = (minAmount + maxAmount) / 2;
  const referralFee = calculateReferralFee();
  const giggerDeposit = calculateGiggerDeposit(rangeAverage);

  const isDiggerView = viewMode === "digger";
  const isGiggerView = viewMode === "gigger";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {isDiggerView ? "Submit Your Proposal" : "Review Proposal"}
          <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
            Demo Mode
          </Badge>
        </CardTitle>
        <CardDescription>
          {isDiggerView 
            ? "Provide your cost estimate and proposal for this project"
            : "Review this proposal and accept or ask questions"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gigger's Budget Range (always shown) */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-blue-700 dark:text-blue-400">Client's Budget Range</p>
                <p className="text-lg font-semibold text-foreground">
                  ${effectiveBudgetMin.toLocaleString()} – ${effectiveBudgetMax.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Type Selection (Digger view only) */}
          {isDiggerView && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Your Pricing
              </Label>
              <RadioGroup value={pricingType} onValueChange={(v) => setPricingType(v as "range" | "fixed")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="range" id="range" />
                  <Label htmlFor="range" className="cursor-pointer">Cost Range</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="cursor-pointer">Fixed Price</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Cost Range or Fixed Price Input */}
          {pricingType === "range" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amountMin" className="text-xs text-muted-foreground">
                    Your Minimum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="amountMin"
                      type="number"
                      value={amountMin}
                      onChange={(e) => handleMinChange(e.target.value)}
                      className="pl-7"
                      placeholder="1,000"
                      disabled={isGiggerView}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="amountMax" className="text-xs text-muted-foreground">
                    Your Maximum (max 20% above min)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="amountMax"
                      type="number"
                      value={amountMax}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const currentMaxAllowed = Math.round(minAmount * 1.2);
                        if (val <= currentMaxAllowed) {
                          setAmountMax(e.target.value);
                        }
                      }}
                      max={Math.round(minAmount * 1.2)}
                      className="pl-7"
                      placeholder="5,000"
                      disabled={isGiggerView}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max allowed: ${Math.round(minAmount * 1.2).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="fixedPrice" className="text-xs text-muted-foreground">
                Fixed Price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="fixedPrice"
                  type="number"
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                  className="pl-7"
                  placeholder="5,000"
                  disabled={isGiggerView}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Note: Referral fee is still calculated based on your cost range average, not fixed price.
              </p>
            </div>
          )}

          {/* Referral Fee Info (Exclusive only) */}
          {pricingModel === "exclusive" && minAmount > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-orange-700 dark:text-orange-400">Referral Fee (2.5%)</p>
                  <p className="text-sm text-muted-foreground">
                    {isDiggerView ? "If awarded and you accept, you'll pay" : "Digger pays"} a referral fee of{" "}
                    <span className="font-semibold text-foreground">
                      ${referralFee.toFixed(0)}
                    </span>{" "}
                    based on the range average (${rangeAverage.toLocaleString()}).
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fee range: ${REFERRAL_FEE_MIN} minimum – ${REFERRAL_FEE_CAP} cap
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium">
                    Gigger pays 5% deposit (${giggerDeposit.toFixed(0)}) when {isDiggerView ? "you accept" : "accepting"} the award.
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
              disabled={isGiggerView}
            />
          </div>

          {/* Proposal */}
          <div className="space-y-2">
            <Label htmlFor="proposal" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {isDiggerView ? "Your Proposal" : "Digger's Proposal"}
            </Label>
            <Textarea
              id="proposal"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder="Describe your approach, experience, and why you're the best fit..."
              rows={5}
              disabled={isGiggerView}
            />
            {isDiggerView && (
              <p className="text-xs text-muted-foreground text-right">
                {proposal.length} characters (minimum 50)
              </p>
            )}
          </div>

          {/* Preview Toggle (Digger view only) */}
          {isDiggerView && (
            <>
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

              {/* Submit Button for Digger */}
              <Button type="submit" className="w-full" size="lg">
                Submit Proposal (Demo)
              </Button>
            </>
          )}

          {/* Gigger Actions - Always visible at bottom */}
          {isGiggerView && (
            <div className="space-y-4 pt-4 border-t">
              {/* Ask Clarification Question */}
              <div className="space-y-2">
                <Label htmlFor="clarification" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Ask a Clarification Question
                </Label>
                <Textarea
                  id="clarification"
                  value={clarificationQuestion}
                  onChange={(e) => setClarificationQuestion(e.target.value)}
                  placeholder="Ask the Digger a question about their proposal..."
                  rows={3}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAskQuestion}
                  disabled={!clarificationQuestion.trim()}
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Question
                </Button>
              </div>

              {/* Accept Proposal Button - Always visible */}
              <div className="sticky bottom-0 bg-background pt-4">
                <Button 
                  type="button" 
                  onClick={handleAcceptProposal}
                  className="w-full bg-green-600 hover:bg-green-700" 
                  size="lg"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Accept Proposal
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  You'll be charged a 5% deposit (${giggerDeposit.toFixed(0)}) upon acceptance. 
                  Digger pays 2.5% fee (${referralFee.toFixed(0)}).
                </p>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
