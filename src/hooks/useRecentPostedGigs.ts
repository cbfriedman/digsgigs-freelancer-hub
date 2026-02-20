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

async function fetchOpenGigsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("gigs")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (error) throw error;
  return count ?? 0;
}

export function useRecentPostedGigs(enabled: boolean) {
  const [gigs, setGigs] = useState<RecentPostedGig[]>([]);
  const [totalOpenCount, setTotalOpenCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    try {
      const [gigsData, count] = await Promise.all([
        fetchRecentPostedGigs(),
        fetchOpenGigsCount(),
      ]);
      setGigs(gigsData);
      setTotalOpenCount(count);
    } catch {
      setGigs([]);
      setTotalOpenCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setGigs([]);
      setTotalOpenCount(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [gigsData, count] = await Promise.all([
          fetchRecentPostedGigs(),
          fetchOpenGigsCount(),
        ]);
        if (!cancelled) {
          setGigs(gigsData);
          setTotalOpenCount(count);
        }
      } catch {
        if (!cancelled) {
          setGigs([]);
          setTotalOpenCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Real-time: when any new open gig is posted, refresh list and count so diggers see it promptly
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("recent-posted-gigs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gigs",
        },
        (payload) => {
          const row = payload.new as { status?: string };
          if (row?.status === "open") refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "gigs",
        },
        (payload) => {
          const row = payload.new as { status?: string };
          const old = payload.old as { status?: string };
          if (row?.status === "open" || old?.status === "open") refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, refetch]);

  return { gigs, totalOpenCount, loading, refetch };
}
