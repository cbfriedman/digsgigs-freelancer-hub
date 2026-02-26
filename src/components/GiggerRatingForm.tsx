import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GiggerRatingFormProps {
  consumerId: string;
  gigId: string;
  diggerId: string;
  gigTitle: string;
  existingRating?: {
    id: string;
    rating: number;
    review_text: string | null;
  };
  onSuccess?: () => void;
}

export const GiggerRatingForm = ({
  consumerId,
  gigId,
  diggerId,
  gigTitle,
  existingRating,
  onSuccess,
}: GiggerRatingFormProps) => {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to rate");
        return;
      }
      if (existingRating) {
        const { error } = await supabase
          .from("gigger_ratings")
          .update({
            rating,
            review_text: reviewText || null,
          })
          .eq("id", existingRating.id);
        if (error) throw error;
        toast.success("Rating updated successfully");
      } else {
        const { error } = await supabase.from("gigger_ratings").insert({
          digger_id: diggerId,
          consumer_id: consumerId,
          gig_id: gigId,
          rating,
          review_text: reviewText || null,
        });
        if (error) throw error;
        toast.success("Thanks! Your review helps other freelancers know what to expect from this client.");
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
      <p className="text-sm text-muted-foreground">
        One review per gig. Your review will be visible to the client after they have also left a review for this gig.
      </p>
      <div className="space-y-2">
        <Label>Overall rating (1–5 stars)</Label>
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
                  star <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="gigger-review">Your review (optional)</Label>
        <Textarea
          id="gigger-review"
          placeholder="How was communication, clarity of requirements, and payment? Your feedback helps the community."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
        />
      </div>
      <Button type="submit" disabled={isSubmitting || rating === 0}>
        {isSubmitting ? "Submitting..." : existingRating ? "Update review" : "Submit review"}
      </Button>
    </form>
  );
};
