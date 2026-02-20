import { useEffect, useState, useCallback } from "react";
import { Star, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface GiggerRatingsListProps {
  /** Gigger's user id (consumer_id in gigger_ratings) */
  consumerId: string;
  /** Optional: show rating stats (average, count) - pass from gigger_profiles */
  averageRating?: number | null;
  totalRatings?: number | null;
  title?: string;
}

interface GiggerRatingRow {
  id: string;
  rating: number;
  review_text: string | null;
  gigger_response: string | null;
  responded_at: string | null;
  created_at: string;
  gig_id: string;
  digger_profiles: {
    id: string;
    profession: string | null;
    profile_image_url: string | null;
    user_id: string;
  } | null;
  gigs: { title: string | null } | null;
}

export const GiggerRatingsList = ({
  consumerId,
  averageRating,
  totalRatings,
  title = "Reviews from professionals",
}: GiggerRatingsListProps) => {
  const [ratings, setRatings] = useState<GiggerRatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRatings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("gigger_ratings")
        .select(
          `
          id,
          rating,
          review_text,
          gigger_response,
          responded_at,
          created_at,
          gig_id,
          digger_profiles ( id, profession, profile_image_url, user_id ),
          gigs ( title )
        `
        )
        .eq("consumer_id", consumerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRatings((data as GiggerRatingRow[]) ?? []);
    } catch (e) {
      console.error("Error fetching gigger ratings:", e);
    } finally {
      setLoading(false);
    }
  }, [consumerId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayRating = (averageRating ?? 0).toFixed(1);
  const count = totalRatings ?? ratings.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          {count > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{displayRating}</span>
              <span className="text-muted-foreground">({count} review{count !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {ratings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No reviews from professionals yet.</p>
        ) : (
          <div className="space-y-4">
            {ratings.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {r.digger_profiles?.profession ?? "Professional"}
                        {r.gigs?.title && (
                          <span className="text-muted-foreground font-normal"> · {r.gigs.title}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {r.review_text && <p className="text-sm">{r.review_text}</p>}
                {r.gigger_response && (
                  <div className="pl-4 border-l-2 border-muted">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Your response</p>
                    <p className="text-sm">{r.gigger_response}</p>
                    {r.responded_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(r.responded_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
