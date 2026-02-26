import { useEffect, useState, useCallback } from "react";
import { Star, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  gigs: { title: string | null; budget_min: number | null; budget_max: number | null } | null;
  /** Actual paid amount from escrow (set after fetch) */
  paidAmount?: number | null;
}

function formatBudgetRange(min: number | null, max: number | null): string {
  if (min != null && max != null) return `$${Math.round(min).toLocaleString()} - $${Math.round(max).toLocaleString()}`;
  if (min != null) return `From $${Math.round(min).toLocaleString()}`;
  if (max != null) return `Up to $${Math.round(max).toLocaleString()}`;
  return "";
}

export const GiggerRatingsList = ({
  consumerId,
  averageRating,
  totalRatings,
  title = "Reviews from freelancers",
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
          gigs ( title, budget_min, budget_max )
        `
        )
        .eq("consumer_id", consumerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = (data as GiggerRatingRow[]) ?? [];

      // Fetch actual paid amount per gig via RPC (works for owner and visitors; escrow table RLS blocks direct read for non-owner)
      let paidByGig: Record<string, number> = {};
      const { data: paidRows } = await supabase.rpc("get_gigger_paid_amounts_by_gig", {
        p_consumer_id: consumerId,
      });
      (paidRows || []).forEach((row: { gig_id: string; total_amount: number }) => {
        if (row.gig_id) paidByGig[row.gig_id] = Number(row.total_amount);
      });

      setRatings(
        list.map((r) => ({
          ...r,
          paidAmount: r.gig_id ? paidByGig[r.gig_id] : null,
        }))
      );
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
          <p className="text-sm text-muted-foreground py-4">No reviews from freelancers yet.</p>
        ) : (
          <div className="space-y-4">
            {ratings.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50">
                      <AvatarImage src={r.digger_profiles?.profile_image_url ?? undefined} alt="" />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {r.digger_profiles?.profession ?? "Freelancer"}
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
                      {((r.paidAmount != null && r.paidAmount > 0) || (r.gigs && (r.gigs.budget_min != null || r.gigs.budget_max != null))) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {r.paidAmount != null && r.paidAmount > 0
                            ? `Paid: $${Number(r.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : `Budget: ${formatBudgetRange(r.gigs?.budget_min ?? null, r.gigs?.budget_max ?? null)}`}
                        </p>
                      )}
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
