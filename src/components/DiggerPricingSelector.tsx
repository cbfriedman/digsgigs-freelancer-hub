import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const { calculateLeadCost } = useCommissionCalculator();
  const { leadCost } = calculateLeadCost('non-exclusive');

  const showsFixedPrice = pricingModel === 'fixed' || pricingModel === 'both';
  const showsHourly = pricingModel === 'hourly' || pricingModel === 'both';
  const showsFreeEstimate = offersFreEstimates;

  const handleSelect = (model: 'fixed' | 'hourly' | 'free_estimate') => setSelectedModel(model);

  const handlePurchaseLead = async () => {
    if (!selectedModel) return;
    setIsLoading(true);
    try {
      const data = await invokeEdgeFunction<{ url?: string; success?: boolean; message?: string }>(
        supabase,
        'create-lead-purchase-checkout',
        { body: { diggerId, gigId, pricingModel: selectedModel } }
      );
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Redirecting to payment...');
      } else if (data?.success) {
        toast.success(data.message || 'Lead access granted!');
        onSelectPricing(selectedModel);
      }
    } catch (error: any) {
      console.error('Error purchasing lead:', error);
      toast.error(error?.message ?? 'Failed to process lead purchase');
    } finally {
      setIsLoading(false);
    }
  };

  const optionClass = (isSelected: boolean) =>
    cn(
      "flex-1 min-w-0 rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors cursor-pointer",
      isSelected ? "border-primary bg-primary/5 text-foreground" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
    );

  return (
    <Card className="mt-4 border shadow-none">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">Get a proposal</p>
        <div className="flex flex-wrap gap-2">
          {showsFixedPrice && (
            <button
              type="button"
              className={optionClass(selectedModel === 'fixed')}
              onClick={() => handleSelect('fixed')}
            >
              Fixed price
            </button>
          )}
          {showsHourly && (
            <button
              type="button"
              className={optionClass(selectedModel === 'hourly')}
              onClick={() => handleSelect('hourly')}
            >
              Hourly
            </button>
          )}
          {showsFreeEstimate && (
            <button
              type="button"
              className={optionClass(selectedModel === 'free_estimate')}
              onClick={() => handleSelect('free_estimate')}
            >
              Free estimate
            </button>
          )}
        </div>
        {selectedModel && (
          <>
            <p className="text-xs text-muted-foreground">
              Lead ${leadCost} · Escrow 8%
            </p>
            <Button
              className="w-full"
              size="sm"
              onClick={handlePurchaseLead}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                selectedModel === 'fixed' ? 'Request fixed price proposal' : selectedModel === 'hourly' ? 'Request hourly quote' : 'Request free estimate'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};