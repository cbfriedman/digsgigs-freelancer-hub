import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RatingForm } from "./RatingForm";
import { supabase } from "@/integrations/supabase/client";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diggerId: string;
  gigId: string;
  gigTitle: string;
  onSuccess?: () => void;
}

export const RatingDialog = ({
  open,
  onOpenChange,
  diggerId,
  gigId,
  gigTitle,
  onSuccess,
}: RatingDialogProps) => {
  const [existingRating, setExistingRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      checkExistingRating();
    }
  }, [open, diggerId, gigId]);

  const checkExistingRating = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("digger_id", diggerId)
        .eq("gig_id", gigId)
        .eq("consumer_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setExistingRating(data);
    } catch (error) {
      console.error("Error checking existing rating:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            {existingRating ? "Update Your Rating" : "Rate This Professional"}
          </DialogTitle>
          <DialogDescription>
            How was your experience working on "{gigTitle}"?
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <RatingForm
            diggerId={diggerId}
            gigId={gigId}
            existingRating={existingRating}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
