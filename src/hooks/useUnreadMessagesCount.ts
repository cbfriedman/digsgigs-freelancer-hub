import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the count of messages unread by the current user (sent by others, read_at is null).
 * Used for the Messages nav icon badge.
 */
export function useUnreadMessagesCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchCount = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.id || !mounted) return;

        // Get conversation IDs where current user is participant (consumer or digger)
        const [{ data: asConsumer }, { data: asDigger }] = await Promise.all([
          supabase.from("conversations").select("id").eq("consumer_id", user.id),
          (async () => {
            const { data: profiles } = await supabase
              .from("digger_profiles")
              .select("id")
              .eq("user_id", user.id);
            const ids = (profiles || []).map((p) => p.id);
            if (ids.length === 0) return { data: [] as { id: string }[] };
            return supabase.from("conversations").select("id").in("digger_id", ids);
          })(),
        ]);
        const seen = new Set<string>();
        [...(asConsumer || []), ...(asDigger || [])].forEach((c) => seen.add(c.id));
        const conversationIds = Array.from(seen);
        if (conversationIds.length === 0) {
          if (mounted) setCount(0);
          return;
        }

        const { count: unreadCount, error } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", conversationIds)
          .is("read_at", null)
          .neq("sender_id", user.id);

        if (error) throw error;
        if (mounted) setCount(unreadCount ?? 0);
      } catch (e) {
        if (mounted) setCount(0);
      }
    };

    fetchCount();

    const channel = supabase
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

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
