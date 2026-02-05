import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";

interface LeadReturnDialogProps {
  leadPurchaseId: string;
  gigTitle: string;
  onSuccess?: () => void;
  buttonClassName?: string;
}

const RETURN_REASONS = [
  {
    id: "mismatch",
    label: "Lead does not match my occupation",
    description: "This gig doesn't match my professional qualifications (verified by AI)"
  }
];

export const LeadReturnDialog = ({ leadPurchaseId, gigTitle, onSuccess, buttonClassName }: LeadReturnDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("Please select a reason for returning this lead");
      return;
    }


    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to return a lead");
        return;
      }

      const data = await invokeEdgeFunction<{ autoApproved?: boolean; message?: string }>(
        supabase,
        'process-lead-return',
        {
          body: {
            leadPurchaseId,
            issueType: selectedReason,
            description: description || RETURN_REASONS.find(r => r.id === selectedReason)?.label || ""
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (data?.autoApproved) {
        toast.success(data.message, {
          description: "The credit has been added to your account.",
          duration: 5000,
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
        });
      } else {
        toast.success(data.message, {
          description: "Our team will review your request within 24-48 hours.",
          duration: 5000
        });
      }

      setOpen(false);
      setSelectedReason("");
      setDescription("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting return request:", error);
      toast.error(error?.message || "Failed to submit return request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={buttonClassName || "gap-2"}>
          <ArrowLeft className="h-4 w-4" />
          Return Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return Lead for Credit</DialogTitle>
          <DialogDescription>
            Request a credit for: <span className="font-semibold">{gigTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Reason for Return *</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {RETURN_REASONS.map((reason) => (
                <div key={reason.id} className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value={reason.id} id={reason.id} className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor={reason.id}
                      className="font-medium cursor-pointer"
                    >
                      {reason.label}
                      {reason.id === "mismatch" && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          AI Verified
                        </span>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "mismatch" && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-1">AI Verification</p>
                  <p>
                    If you select this reason, our AI will automatically verify whether the gig matches your 
                    professional qualifications. If confirmed, you'll receive an instant credit.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">
              Additional Details (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context for your return request..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Help us improve by explaining why you're returning this lead
            </p>
          </div>

          <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Refund Policy</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• AI-verified occupation mismatches: Instant 100% credit</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setSelectedReason("");
              setDescription("");
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Return Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
