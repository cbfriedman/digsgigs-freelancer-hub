import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RatingFormProps {
  diggerId: string;
  gigId: string;
  existingRating?: {
    id: string;
    rating: number;
    review_text: string | null;
  };
  onSuccess?: () => void;
}

export const RatingForm = ({ diggerId, gigId, existingRating, onSuccess }: RatingFormProps) => {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState(existingRating?.review_text || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to rate");
        return;
      }

      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from("ratings")
          .update({
            rating,
            review_text: reviewText || null,
          })
          .eq("id", existingRating.id);

        if (error) throw error;
        toast.success("Rating updated successfully");
      } else {
        // Create new rating
        const { error } = await supabase
          .from("ratings")
          .insert({
            digger_id: diggerId,
            consumer_id: user.id,
            gig_id: gigId,
            rating,
            review_text: reviewText || null,
          });

        if (error) throw error;
        toast.success("Rating submitted successfully");
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      toast.error(error.message || "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Your Rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review">Your Review (Optional)</Label>
        <Textarea
          id="review"
          placeholder="Share your experience working with this professional..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isSubmitting || rating === 0}>
        {isSubmitting ? "Submitting..." : existingRating ? "Update Rating" : "Submit Rating"}
      </Button>
    </form>
  );
};
