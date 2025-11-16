import { useState } from "react";
import { Star, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface RatingCardProps {
  rating: {
    id: string;
    rating: number;
    review_text: string | null;
    digger_response: string | null;
    responded_at: string | null;
    created_at: string;
    profiles: {
      full_name: string | null;
    };
  };
  isDigger?: boolean;
  onResponseSubmitted?: () => void;
}

export const RatingCard = ({ rating, isDigger, onResponseSubmitted }: RatingCardProps) => {
  const [isResponding, setIsResponding] = useState(false);
  const [response, setResponse] = useState(rating.digger_response || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("ratings")
        .update({
          digger_response: response,
          responded_at: new Date().toISOString(),
        })
        .eq("id", rating.id);

      if (error) throw error;

      toast.success("Response submitted successfully");
      setIsResponding(false);
      onResponseSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting response:", error);
      toast.error(error.message || "Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{rating.profiles.full_name || "Anonymous"}</p>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < rating.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {rating.review_text && (
        <CardContent className="pb-3">
          <p className="text-sm">{rating.review_text}</p>
        </CardContent>
      )}

      {rating.digger_response && (
        <CardContent className="border-t bg-muted/30 pb-3">
          <p className="text-sm font-medium mb-1">Response from Professional:</p>
          <p className="text-sm text-muted-foreground">{rating.digger_response}</p>
          {rating.responded_at && (
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(rating.responded_at), { addSuffix: true })}
            </p>
          )}
        </CardContent>
      )}

      {isDigger && !rating.digger_response && (
        <CardContent className="border-t pt-4">
          {!isResponding ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResponding(true)}
            >
              Respond to Review
            </Button>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Write your response..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitResponse}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Response"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsResponding(false);
                    setResponse(rating.digger_response || "");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
