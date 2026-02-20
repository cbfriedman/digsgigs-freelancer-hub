import { useState, useEffect, useCallback } from "react";
import { Star, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GiggerRatingForm } from "./GiggerRatingForm";
import { supabase } from "@/integrations/supabase/client";

interface GiggerRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consumerId: string;
  gigId: string;
  diggerId: string;
  gigTitle: string;
  onSuccess?: () => void;
}

export const GiggerRatingDialog = ({
  open,
  onOpenChange,
  consumerId,
  gigId,
  diggerId,
  gigTitle,
  onSuccess,
}: GiggerRatingDialogProps) => {
  const [existingRating, setExistingRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkExisting = useCallback(async () => {
    if (!gigId || !diggerId) return;
    try {
      const { data, error } = await supabase
        .from("gigger_ratings")
        .select("*")
        .eq("gig_id", gigId)
        .eq("digger_id", diggerId)
        .maybeSingle();
      if (error) throw error;
      setExistingRating(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [gigId, diggerId]);

  useEffect(() => {
    if (open) checkExisting();
  }, [open, checkExisting]);

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            {existingRating ? "Update your review of this client" : "Rate this client"}
          </DialogTitle>
          <DialogDescription>
            How was your experience working with the client on &quot;{gigTitle}&quot;? One review per gig.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <GiggerRatingForm
            consumerId={consumerId}
            gigId={gigId}
            diggerId={diggerId}
            gigTitle={gigTitle}
            existingRating={existingRating}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
