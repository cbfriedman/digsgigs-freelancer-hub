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

        // Use type-safe approach with explicit any casting at start
        const client = supabase as any;

        // Get digger profile IDs
        const { data: profilesData } = await client
          .from("digger_profiles")
          .select("id")
          .eq("user_id", user.id);
        const diggerIds = ((profilesData as { id: string }[]) || []).map((p) => p.id);

        // Gather conversation IDs where user is participant
        const conversationIds: string[] = [];

        // As consumer
        const { data: consumerData } = await client
          .from("conversations")
          .select("id")
          .eq("consumer_id", user.id);
        ((consumerData as { id: string }[]) || []).forEach((c) => conversationIds.push(c.id));

        // As digger
        if (diggerIds.length > 0) {
          const { data: diggerData } = await client
            .from("conversations")
            .select("id")
            .in("digger_id", diggerIds);
          ((diggerData as { id: string }[]) || []).forEach((c) => conversationIds.push(c.id));
        }

        // As admin
        const { data: adminData } = await client
          .from("conversations")
          .select("id")
          .eq("admin_id", user.id);
        ((adminData as { id: string }[]) || []).forEach((c) => conversationIds.push(c.id));

        // Dedupe
        const uniqueIds = [...new Set(conversationIds)];
        if (uniqueIds.length === 0) {
          if (mounted) setCount(0);
          return;
        }

        // Count unread messages
        const { count: unreadCount, error } = await client
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", uniqueIds)
          .is("read_at", null)
          .neq("sender_id", user.id);

        if (error) throw error;
        if (mounted) setCount((unreadCount as number) ?? 0);
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
