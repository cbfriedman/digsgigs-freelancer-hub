import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";

export default function ProjectCostCalculator() {
  const [projectBudget, setProjectBudget] = useState(5000);
  const [hourlyRate, setHourlyRate] = useState(75);
  const [estimatedHours, setEstimatedHours] = useState(67); // Default to match $5000 at $75/hr
  const [subscriptionTier, setSubscriptionTier] = useState("pro");
  const [freeEstimatePaid, setFreeEstimatePaid] = useState(false);

  const { calculateFreeEstimateRebate, calculateFreeEstimateCost } = useCommissionCalculator();

  const subscriptionCosts = {
    free: 0,
    pro: 99,
    premium: 599,
  };

  // Contract award fee percentages
  const contractAwardFees = {
    free: 0.12, // 12%
    pro: 0.08,  // 8%
    premium: 0.03, // 3%
  };

  // Free estimate rebate calculations
  const freeEstimateCost = calculateFreeEstimateCost(subscriptionTier as 'free' | 'pro' | 'premium');
  
  const fixedPriceRebate = calculateFreeEstimateRebate(
    projectBudget,
    'fixed',
    subscriptionTier as 'free' | 'pro' | 'premium',
    freeEstimatePaid
  );

  const hourlyRebate = calculateFreeEstimateRebate(
    hourlyRate * estimatedHours,
    'hourly',
    subscriptionTier as 'free' | 'pro' | 'premium',
    freeEstimatePaid
  );

  // Fixed-Price Calculations
  const fixedPriceSubtotal = projectBudget;
  const contractAwardFee = projectBudget * contractAwardFees[subscriptionTier as keyof typeof contractAwardFees];
  const escrowProcessingFee = Math.max(10, projectBudget * 0.05); // 5% with $10 min
  const fixedPriceAwardFeeAfterRebate = Math.max(0, contractAwardFee - fixedPriceRebate.rebateAmount);
  const fixedPriceTotal = fixedPriceSubtotal + fixedPriceAwardFeeAfterRebate + escrowProcessingFee;

  // Hourly Rate Calculations
  const hourlyWorkCost = hourlyRate * estimatedHours;
  const subscriptionFee = subscriptionCosts[subscriptionTier as keyof typeof subscriptionCosts];
  const hourlyMultipliers = { free: 3, pro: 2, premium: 1 };
  const hourlyAwardUpcharge = hourlyRate * hourlyMultipliers[subscriptionTier as keyof typeof hourlyMultipliers];
  const hourlyEscrowFee = Math.max(10, hourlyWorkCost * 0.05); // 5% with $10 min
  // Note: No rebate applied for hourly as per new rules
  const hourlyTotal = hourlyWorkCost + subscriptionFee + hourlyAwardUpcharge + hourlyEscrowFee;

  // Comparison
  const difference = Math.abs(fixedPriceTotal - hourlyTotal);
  const cheaperModel = fixedPriceTotal < hourlyTotal ? "fixed" : "hourly";
  const percentageDifference = ((difference / Math.max(fixedPriceTotal, hourlyTotal)) * 100).toFixed(1);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calculator className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold">Interactive Cost Calculator</h2>
          </div>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Compare costs between fixed-price and hourly rate projects based on your specific needs
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Input Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Adjust the values to see how costs compare</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Fixed Price Inputs */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase">Fixed-Price Project</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="projectBudget">Total Project Budget</Label>
                      <span className="text-sm font-medium">${projectBudget.toLocaleString()}</span>
                    </div>
                    <Slider
                      id="projectBudget"
                      min={1000}
                      max={50000}
                      step={500}
                      value={[projectBudget]}
                      onValueChange={(value) => setProjectBudget(value[0])}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      The agreed total cost for the entire project
                    </p>
                  </div>
                </div>

                {/* Right Column - Hourly Rate Inputs */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase">Hourly Rate Project</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="hourlyRate">Hourly Rate</Label>
                        <span className="text-sm font-medium">${hourlyRate}/hour</span>
                      </div>
                      <Slider
                        id="hourlyRate"
                        min={25}
                        max={250}
                        step={5}
                        value={[hourlyRate]}
                        onValueChange={(value) => {
                          setHourlyRate(value[0]);
                          // Auto-adjust hours to keep similar total
                          setEstimatedHours(Math.round(projectBudget / value[0]));
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="estimatedHours">Estimated Hours</Label>
                        <span className="text-sm font-medium">{estimatedHours} hours</span>
                      </div>
                      <Slider
                        id="estimatedHours"
                        min={10}
                        max={500}
                        step={5}
                        value={[estimatedHours]}
                        onValueChange={(value) => setEstimatedHours(value[0])}
                        className="w-full"
                      />
                    </div>

                     <div className="space-y-2">
                      <Label htmlFor="subscription">Your Subscription Tier</Label>
                      <Select value={subscriptionTier} onValueChange={setSubscriptionTier}>
                        <SelectTrigger id="subscription">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free ($0/month)</SelectItem>
                          <SelectItem value="pro">Pro ($79/month)</SelectItem>
                          <SelectItem value="premium">Premium ($299/month)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="freeEstimate"
                          checked={freeEstimatePaid}
                          onChange={(e) => setFreeEstimatePaid(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="freeEstimate" className="cursor-pointer">
                          Previously paid for Free Estimate (${freeEstimateCost})
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rebate Information */}
          {freeEstimatePaid && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Free Estimate Rebate Rules:</strong> Rebates are only available for fixed-price contracts of $5,000 or more. 
                No rebates are available for hourly rate contracts.
                {fixedPriceRebate.rebateApplied && (
                  <span className="text-green-600 font-medium"> ✓ Your fixed-price contract qualifies for a ${fixedPriceRebate.rebateAmount} rebate!</span>
                )}
                {!fixedPriceRebate.rebateApplied && fixedPriceRebate.rebateReason && (
                  <span className="text-muted-foreground"> • {fixedPriceRebate.rebateReason}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Fixed-Price Results */}
            <Card className={`border-2 ${cheaperModel === 'fixed' ? 'border-green-500 bg-green-50/50' : 'border-border'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Fixed-Price Contract</CardTitle>
                  <Badge variant="default">With Escrow</Badge>
                </div>
                {cheaperModel === 'fixed' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-sm font-semibold">{percentageDifference}% cheaper</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Project cost</span>
                    <span className="font-medium">${fixedPriceSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contract Award Fee ({(contractAwardFees[subscriptionTier as keyof typeof contractAwardFees] * 100)}%)</span>
                    <span className="font-medium">${contractAwardFee.toFixed(0)}</span>
                  </div>
                  {fixedPriceRebate.rebateApplied && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Free Estimate Rebate</span>
                      <span className="font-medium">-${fixedPriceRebate.rebateAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Escrow Processing Fee (5%, min $10)</span>
                    <span className="font-medium">${escrowProcessingFee.toFixed(0)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Cost</span>
                    <span className="text-primary">${fixedPriceTotal.toFixed(0)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <h5 className="font-semibold text-sm">Key Benefits:</h5>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Fixed, predictable cost</li>
                    <li>✓ Escrow protection for both parties</li>
                    <li>✓ Milestone-based payments</li>
                    <li>✓ Clear scope and deliverables</li>
                    {projectBudget >= 5000 && <li className="text-green-600 font-medium">✓ Eligible for free estimate rebate ($5,000+)</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Hourly Rate Results */}
            <Card className={`border-2 ${cheaperModel === 'hourly' ? 'border-green-500 bg-green-50/50' : 'border-border'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Hourly Rate Project</CardTitle>
                  <Badge variant="secondary">Flexible</Badge>
                </div>
                {cheaperModel === 'hourly' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-sm font-semibold">{percentageDifference}% cheaper</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Work completed ({estimatedHours} hrs @ ${hourlyRate}/hr)</span>
                    <span className="font-medium">${hourlyWorkCost.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform subscription ({subscriptionTier})</span>
                    <span className="font-medium">${subscriptionFee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hourly Award Upcharge ({hourlyMultipliers[subscriptionTier as keyof typeof hourlyMultipliers]}x avg rate)</span>
                    <span className="font-medium">${hourlyAwardUpcharge.toFixed(0)}</span>
                  </div>
                  {freeEstimatePaid && (
                    <div className="flex justify-between text-sm text-muted-foreground italic">
                      <span>Free Estimate Rebate</span>
                      <span>Not available (hourly)</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Escrow Processing Fee (5%, min $10)</span>
                    <span className="font-medium">${hourlyEscrowFee.toFixed(0)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Cost</span>
                    <span className="text-primary">${hourlyTotal.toFixed(0)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <h5 className="font-semibold text-sm">Key Benefits:</h5>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Pay only for time worked</li>
                    <li>✓ Flexible scope adjustments</li>
                    <li>✓ Easier for ongoing projects</li>
                    <li>✓ No free estimate rebates available</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendation */}
          <Card className="mt-6 bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Recommendation</h4>
                  <p className="text-sm text-muted-foreground">
                    {cheaperModel === 'fixed' ? (
                      <>
                        For this project, a <strong>fixed-price contract</strong> would be <strong>${difference.toLocaleString()} cheaper</strong> ({percentageDifference}% savings). 
                        Fixed-price is ideal when you have a clear scope and want budget certainty with escrow protection.
                      </>
                    ) : (
                      <>
                        For this project, an <strong>hourly rate arrangement</strong> would be <strong>${difference.toLocaleString()} cheaper</strong> ({percentageDifference}% savings). 
                        Hourly rate is ideal for ongoing work, maintenance, or projects with evolving requirements.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
