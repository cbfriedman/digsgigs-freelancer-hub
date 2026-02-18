import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecentGig {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const RECENT_LIMIT = 6;

async function fetchRecentGigs(userId: string): Promise<RecentGig[]> {
  const { data, error } = await supabase
    .from("gigs")
    .select("id, title, status, created_at")
    .eq("consumer_id", userId)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;
  return (data as RecentGig[]) || [];
}

export function useRecentGigs(userId: string | undefined) {
  const [gigs, setGigs] = useState<RecentGig[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchRecentGigs(userId);
      setGigs(data);
    } catch {
      setGigs([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setGigs([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await fetchRecentGigs(userId);
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
  }, [userId]);

  // Realtime: when this user posts a new gig, refresh the list so the header dropdown updates promptly
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`recent-gigs:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gigs",
          filter: `consumer_id=eq.${userId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  return { gigs, loading, refetch };
}
