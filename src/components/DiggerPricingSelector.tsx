import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, FileText, Loader2 } from "lucide-react";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiggerPricingSelectorProps {
  diggerId: string;
  gigId: string;
  pricingModel: string;
  subscriptionTier: string;
  hourlyRateMin?: number | null;
  hourlyRateMax?: number | null;
  offersFreEstimates?: boolean | null;
  businessName: string;
  onSelectPricing: (model: 'fixed' | 'hourly' | 'free_estimate') => void;
}

export const DiggerPricingSelector = ({
  diggerId,
  gigId,
  pricingModel,
  subscriptionTier,
  hourlyRateMin,
  hourlyRateMax,
  offersFreEstimates,
  businessName,
  onSelectPricing,
}: DiggerPricingSelectorProps) => {
  const [selectedModel, setSelectedModel] = useState<'fixed' | 'hourly' | 'free_estimate' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { calculateLeadCost, calculateCommission, calculateHourlyAwardCost } = useCommissionCalculator();

  const tier = (subscriptionTier || 'free') as 'free' | 'pro' | 'premium';
  const { leadCost } = calculateLeadCost(tier);
  
  const showsFixedPrice = pricingModel === 'fixed' || pricingModel === 'both';
  const showsHourly = pricingModel === 'hourly' || pricingModel === 'both';
  const showsFreeEstimate = offersFreEstimates;

  const averageHourlyRate = hourlyRateMin && hourlyRateMax 
    ? (hourlyRateMin + hourlyRateMax) / 2 
    : hourlyRateMin || hourlyRateMax || 0;

  const hourlyAwardCost = calculateHourlyAwardCost(averageHourlyRate, tier);

  const handleSelect = (model: 'fixed' | 'hourly' | 'free_estimate') => {
    setSelectedModel(model);
  };

  const handlePurchaseLead = async () => {
    if (!selectedModel) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-lead-purchase-checkout', {
        body: {
          diggerId,
          gigId,
          pricingModel: selectedModel,
        },
      });

      if (error) throw error;

      if (data.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
        toast.success('Redirecting to payment...');
      } else if (data.success) {
        // Free lead access granted
        toast.success(data.message || 'Lead access granted!');
        onSelectPricing(selectedModel);
      }
    } catch (error) {
      console.error('Error purchasing lead:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process lead purchase');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-6 border-primary/20 bg-gradient-to-br from-background to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Get a Proposal from {businessName}
        </CardTitle>
        <CardDescription>
          Choose how you'd like to work with this professional
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {showsFixedPrice && (
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedModel === 'fixed' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelect('fixed')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <FileText className="h-5 w-5 text-primary" />
                  {selectedModel === 'fixed' && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">Fixed Price</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Get a complete proposal with a fixed project cost
                </p>
                <div className="pt-2 border-t">
                  <p className="font-medium">Lead Cost: ${leadCost}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Award fee: {calculateCommission(1000, tier).rate * 100}% of project total
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {showsHourly && (
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedModel === 'hourly' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelect('hourly')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Clock className="h-5 w-5 text-primary" />
                  {selectedModel === 'hourly' && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">Hourly Rate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Pay by the hour for flexible project work
                </p>
                {hourlyRateMin && hourlyRateMax && (
                  <p className="font-medium">
                    ${hourlyRateMin} - ${hourlyRateMax}/hour
                  </p>
                )}
                <div className="pt-2 border-t">
                  <p className="font-medium">Lead Cost: ${leadCost}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Award fee: ${hourlyAwardCost.toFixed(2)} when awarded
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {showsFreeEstimate && (
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedModel === 'free_estimate' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleSelect('free_estimate')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <FileText className="h-5 w-5 text-primary" />
                  {selectedModel === 'free_estimate' && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">Free Estimate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Get a free project estimate before committing
                </p>
                <div className="pt-2 border-t">
                  <p className="font-medium">No upfront cost</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimate cost deducted from award fee if hired
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {selectedModel && (
          <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-primary/20">
            <p className="text-sm font-medium mb-2">Cost Breakdown:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Initial lead cost: ${leadCost} (paid by professional)</li>
              {selectedModel === 'fixed' && (
                <li>• Award fee: {calculateCommission(1000, tier).rate * 100}% of total project cost (when project is awarded)</li>
              )}
              {selectedModel === 'hourly' && (
                <li>• Award fee: ${hourlyAwardCost.toFixed(2)} (when project is awarded)</li>
              )}
              {selectedModel === 'free_estimate' && (
                <li>• Free estimate cost will be deducted from final award fee</li>
              )}
            </ul>
            <Button 
              className="mt-4 w-full" 
              onClick={handlePurchaseLead}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Request ${selectedModel === 'fixed' ? 'Fixed Price Proposal' : selectedModel === 'hourly' ? 'Hourly Quote' : 'Free Estimate'}`
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
