import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecentPostedGig {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const RECENT_LIMIT = 8;

async function fetchRecentPostedGigs(): Promise<RecentPostedGig[]> {
  const { data, error } = await supabase
    .from("gigs")
    .select("id, title, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;
  return (data as RecentPostedGig[]) || [];
}

export function useRecentPostedGigs(enabled: boolean) {
  const [gigs, setGigs] = useState<RecentPostedGig[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const data = await fetchRecentPostedGigs();
      setGigs(data);
    } catch {
      setGigs([]);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setGigs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await fetchRecentPostedGigs();
        if (!cancelled) setGigs(data);
      } catch {
        if (!cancelled) setGigs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { gigs, loading, refetch };
}
