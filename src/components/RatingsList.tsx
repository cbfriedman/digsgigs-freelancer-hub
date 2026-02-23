import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RatingCard } from "./RatingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import { generateReviewSchema } from "./StructuredData";

interface RatingsListProps {
  diggerId: string;
  isDigger?: boolean;
  diggerName?: string;
}

export const RatingsList = ({ diggerId, isDigger, diggerName }: RatingsListProps) => {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRatings = useCallback(async () => {
    try {
      const { data: ratingsData, error } = await supabase
        .from("ratings")
        .select(`
          *,
          profiles:consumer_id (
            full_name,
            avatar_url,
            country
          ),
          gigs:gig_id (
            id,
            title,
            location,
            category_id,
            categories (
              name
            )
          )
        `)
        .eq("digger_id", diggerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = ratingsData || [];

      // Fetch project total budget from escrow_contracts for each gig
      const gigIds = [...new Set(list.map((r: any) => r.gig_id).filter(Boolean))];
      let budgetByGig: Record<string, number> = {};
      if (gigIds.length > 0) {
        const { data: escrows } = await supabase
          .from("escrow_contracts")
          .select("gig_id, total_amount")
          .in("gig_id", gigIds);
        (escrows || []).forEach((e: { gig_id: string; total_amount: number }) => {
          budgetByGig[e.gig_id] = Number(e.total_amount);
        });
      }

      // Fallback: sum transactions per gig if no escrow (legacy)
      const gigIdsWithoutEscrow = gigIds.filter((id) => budgetByGig[id] == null);
      if (gigIdsWithoutEscrow.length > 0) {
        const { data: txRows } = await supabase
          .from("transactions")
          .select("gig_id, total_amount")
          .eq("digger_id", diggerId)
          .in("gig_id", gigIdsWithoutEscrow);
        gigIdsWithoutEscrow.forEach((id) => { budgetByGig[id] = 0; });
        (txRows || []).forEach((t: { gig_id: string; total_amount: number }) => {
          budgetByGig[t.gig_id] = (budgetByGig[t.gig_id] ?? 0) + Number(t.total_amount);
        });
      }

      setRatings(
        list.map((r: any) => ({
          ...r,
          profiles: r.profiles ?? { full_name: null, avatar_url: null, country: null },
          gigs: r.gigs ?? null,
          projectTotalBudget: r.gig_id ? budgetByGig[r.gig_id] : null,
        }))
      );
    } catch (error) {
      console.error("Error fetching ratings:", error);
    } finally {
      setLoading(false);
    }
  }, [diggerId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reviews yet
      </div>
    );
  }

  return (
    <>
      {/* Add Review schema markup for each rating */}
      {diggerName && ratings.length > 0 && (
        <Helmet>
          {ratings.slice(0, 10).map((rating) => ( // Limit to 10 reviews for schema
            <script key={rating.id} type="application/ld+json">
              {JSON.stringify(generateReviewSchema({
                itemReviewed: {
                  name: diggerName,
                  type: "LocalBusiness"
                },
                author: {
                  name: rating.profiles?.full_name || "Anonymous"
                },
                reviewRating: {
                  ratingValue: rating.rating,
                  bestRating: 5
                },
                reviewBody: rating.review_text,
                datePublished: new Date(rating.created_at).toISOString()
              }))}
            </script>
          ))}
        </Helmet>
      )}
      
      <div className="space-y-4">
        {ratings.map((rating) => (
          <RatingCard key={rating.id} rating={rating} />
        ))}
      </div>
    </>
  );
};
