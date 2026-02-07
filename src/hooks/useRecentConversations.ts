import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface RecentConversation {
  id: string;
  partnerDisplayName: string;
  partnerAvatarUrl: string | null;
  lastMessageContent: string | null;
  lastMessageFromMe: boolean;
  updatedAt: string;
  unreadCount: number;
}

const RECENT_LIMIT = 6;

export function useRecentConversations(currentUser: User | null) {
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) {
      setConversations([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_my_conversations" as any);
        if (error) throw error;
        const raw = (data as Array<{
          id: string;
          consumer_id: string;
          digger_id: string | null;
          admin_id: string | null;
          updated_at: string;
          digger_handle: string | null;
          digger_profile_image_url?: string | null;
          consumer_avatar_url?: string | null;
          admin_avatar_url?: string | null;
          last_message_content?: string | null;
          last_message_sender_id?: string | null;
          unread_count?: number;
        }>) || [];

        const list: RecentConversation[] = raw.slice(0, RECENT_LIMIT).map((c) => {
          const uid = currentUser.id;
          let partnerDisplayName = "Unknown";
          let partnerAvatarUrl: string | null = null;
          if (c.admin_id) {
            if (uid === c.admin_id) {
              partnerDisplayName = "User";
              partnerAvatarUrl = c.consumer_avatar_url ?? null;
            } else {
              partnerDisplayName = "Support";
              partnerAvatarUrl = c.admin_avatar_url ?? null;
            }
          } else {
            if (uid === c.consumer_id) {
              partnerDisplayName = c.digger_handle || "Digger";
              partnerAvatarUrl = c.digger_profile_image_url ?? null;
            } else {
              partnerDisplayName = "Client";
              partnerAvatarUrl = c.consumer_avatar_url ?? null;
            }
          }
          const lastMessageFromMe = c.last_message_sender_id === uid;
          return {
            id: c.id,
            partnerDisplayName,
            partnerAvatarUrl,
            lastMessageContent: c.last_message_content ?? null,
            lastMessageFromMe,
            updatedAt: c.updated_at,
            unreadCount: typeof c.unread_count === "number" ? c.unread_count : Number(c.unread_count) || 0,
          };
        });

        if (!cancelled) setConversations(list);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  return { conversations, loading };
}
