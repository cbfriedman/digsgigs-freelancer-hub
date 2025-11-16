import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RatingCard } from "./RatingCard";
import { Skeleton } from "@/components/ui/skeleton";

interface RatingsListProps {
  diggerId: string;
  isDigger?: boolean;
}

export const RatingsList = ({ diggerId, isDigger }: RatingsListProps) => {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select(`
          *,
          profiles:consumer_id (
            full_name
          )
        `)
        .eq("digger_id", diggerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRatings(data || []);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [diggerId]);

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
    <div className="space-y-4">
      {ratings.map((rating) => (
        <RatingCard
          key={rating.id}
          rating={rating}
          isDigger={isDigger}
          onResponseSubmitted={fetchRatings}
        />
      ))}
    </div>
  );
};
