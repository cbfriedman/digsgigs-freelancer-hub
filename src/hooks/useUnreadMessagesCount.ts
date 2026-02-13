import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Returns the count of messages unread by the current user (sent by others, read_at is null).
 * Used for the Messages nav icon badge.
 */
export function useUnreadMessagesCount() {
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchCount = async () => {
      try {
        const { data, error } = await supabase.rpc("get_my_conversations" as never);
        if (error) throw error;
        const conversations =
          (data as Array<{
            unread_count?: number | null;
          }> | null) ?? [];
        const unreadTotal = conversations.reduce((sum, c) => {
          const next = typeof c.unread_count === "number" ? c.unread_count : Number(c.unread_count) || 0;
          return sum + Math.max(0, next);
        }, 0);
        if (mounted) setCount(unreadTotal);
      } catch (e) {
        if (mounted) setCount(0);
      }
    };

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
      await fetchCount();
      const ch = supabase
        .channel("unread-messages-count")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => fetchCount()
        )
        .subscribe();
      channelRef.current = ch;
    };
    setup();

    const onRefresh = () => {
      fetchCount();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("recent-conversations-refresh", onRefresh);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("recent-conversations-refresh", onRefresh);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return count;
}
