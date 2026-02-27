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
      <Card className="border shadow-none">
        <CardHeader className="py-2 px-3"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="space-y-2">{[1, 2].map((i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>
        </CardContent>
      </Card>
    );
  }

  const displayRating = (averageRating ?? 0).toFixed(1);
  const count = totalRatings ?? ratings.length;

  return (
    <Card className="border shadow-none">
      <CardHeader className="py-2 px-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {count > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{displayRating}</span>
              <span className="text-muted-foreground">({count})</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        {ratings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No reviews yet.</p>
        ) : (
          <div className="space-y-2">
            {ratings.map((r) => (
              <div key={r.id} className="rounded-md border border-border/60 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={r.digger_profiles?.profile_image_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-muted text-muted-foreground"><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{r.digger_profiles?.profession ?? "Freelancer"}{r.gigs?.title ? ` · ${r.gigs.title}` : ""}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                      ))}
                      <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                    </div>
                    {((r.paidAmount != null && r.paidAmount > 0) || (r.gigs && (r.gigs.budget_min != null || r.gigs.budget_max != null))) && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {r.paidAmount != null && r.paidAmount > 0 ? `Paid: $${Number(r.paidAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : `Budget: ${formatBudgetRange(r.gigs?.budget_min ?? null, r.gigs?.budget_max ?? null)}`}
                      </p>
                    )}
                  </div>
                </div>
                {r.review_text && <p className="text-xs text-foreground pl-10">{r.review_text}</p>}
                {r.gigger_response && (
                  <div className="pl-2 border-l border-muted mt-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Response</p>
                    <p className="text-xs">{r.gigger_response}</p>
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
