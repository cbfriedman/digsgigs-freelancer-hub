import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Loader2 } from "lucide-react";

interface LeadExclusivityExtensionProps {
  queueEntryId: string;
  basePrice: number;
  currentExtensionNumber: number;
  onSuccess?: () => void;
}

export function LeadExclusivityExtension({
  queueEntryId,
  basePrice,
  currentExtensionNumber,
  onSuccess,
}: LeadExclusivityExtensionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const extensionCost = basePrice * 1.33; // 33% premium
  const nextExtensionNumber = currentExtensionNumber + 1;

  const handleExtend = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-extension-checkout", {
        body: {
          queueEntryId,
          extensionNumber: nextExtensionNumber,
        },
      });

      if (error) throw error;

      // Redirect to Stripe Checkout URL
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Error extending exclusivity:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process extension",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          Extend 24h
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend Exclusivity</DialogTitle>
          <DialogDescription>
            Extend your exclusive access to this lead for another 24 hours
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Base Lead Price:</span>
            <span className="font-bold">${basePrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Extension Premium (33%):</span>
            <span className="font-bold text-yellow-600">
              ${(extensionCost - basePrice).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center p-4 bg-primary/10 border border-primary rounded-lg">
            <span className="font-semibold">Total Extension Cost:</span>
            <span className="text-xl font-bold text-primary">
              ${extensionCost.toFixed(2)}
            </span>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• This is extension #{nextExtensionNumber}</p>
            <p>• You'll get 24 more hours of exclusive access</p>
            <p>• Other diggers still cannot see this lead</p>
            <p>• Extension expires automatically if not purchased again</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExtend} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${extensionCost.toFixed(2)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
