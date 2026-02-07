import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecentGig {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const RECENT_LIMIT = 6;

export function useRecentGigs(userId: string | undefined) {
  const [gigs, setGigs] = useState<RecentGig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setGigs([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("gigs")
          .select("id, title, status, created_at")
          .eq("consumer_id", userId)
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT);

        if (error) throw error;
        if (!cancelled) setGigs((data as RecentGig[]) || []);
      } catch {
        if (!cancelled) setGigs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { gigs, loading };
}
