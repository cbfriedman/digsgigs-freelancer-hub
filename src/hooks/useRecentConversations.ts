import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getCanonicalDiggerProfilePath } from "@/lib/profileUrls";

export interface RecentConversation {
  id: string;
  partnerDisplayName: string;
  partnerAvatarUrl: string | null;
  partnerProfileUrl: string | null;
  partnerJobTitle: string | null;
  gigId: string | null;
  /** Gig owner (gigger) user id - for showing Award button when current user is gigger */
  consumerId: string | null;
  /** Digger profile id - for award flow */
  diggerId: string | null;
  /** Current user is the Digger in this conversation */
  isCurrentUserDigger: boolean;
  lastMessageContent: string | null;
  /** Last message metadata (for award events: { _type: "award_event", event: "awarded"|"accepted"|"declined" }) */
  lastMessageMetadata?: { _type?: string; event?: string } | null;
  lastMessageFromMe: boolean;
  updatedAt: string;
  unreadCount: number;
  muted: boolean;
  isBlocked: boolean;
  partnerUserId: string | null;
}


export function useRecentConversations(currentUser: User | null) {
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const refreshRef = useRef<() => void>(() => {});
  const diggerProfileIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!currentUser?.id) {
      setConversations([]);
      return;
    }

    let cancelled = false;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
    const loadDiggerIds = async () => {
      try {
        const client = supabase as any;
        const { data } = await client
          .from("digger_profiles")
          .select("id")
          .eq("user_id", currentUser.id);
        diggerProfileIdsRef.current = ((data as { id: string }[]) || []).map((p) => p.id);
      } catch {
        diggerProfileIdsRef.current = [];
      }
    };

    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        if (diggerProfileIdsRef.current.length === 0) {
          await loadDiggerIds();
        }
        const { data, error } = await supabase.rpc("get_my_conversations" as any);
        if (error) throw error;
        const raw = (data as Array<{
          id: string;
          consumer_id: string;
          digger_id: string | null;
          admin_id: string | null;
          updated_at: string;
          gig_id?: string | null;
          gig_title?: string | null;
          digger_handle: string | null;
          digger_profile_image_url?: string | null;
          consumer_avatar_url?: string | null;
          consumer_full_name?: string | null;
          admin_avatar_url?: string | null;
          last_message_content?: string | null;
          last_message_sender_id?: string | null;
          last_message_metadata?: { _type?: string; event?: string } | null;
          unread_count?: number;
          muted?: boolean | null;
          is_blocked?: boolean | null;
          partner_user_id?: string | null;
        }>) || [];

        const list: RecentConversation[] = [...raw]
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .map((c) => {
          const uid = currentUser.id;
          let partnerDisplayName = "Unknown";
          let partnerAvatarUrl: string | null = null;
          let partnerProfileUrl: string | null = null;
          let partnerUserId: string | null = null;
          let partnerIsDigger = false;
          const partnerJobTitle = c.gig_title ?? null;
          const gigId = c.gig_id ?? null;
          const currentUserIsDigger =
            !!c.digger_id && diggerProfileIdsRef.current.includes(c.digger_id);
          if (c.admin_id) {
            if (uid === c.admin_id) {
              partnerDisplayName = (c.consumer_full_name || c.digger_handle || "Client").trim() || "Client";
              partnerAvatarUrl = c.consumer_avatar_url ?? c.digger_profile_image_url ?? null;
              partnerUserId = c.consumer_id || c.digger_id || null;
              partnerIsDigger = Boolean(partnerUserId && c.digger_id && partnerUserId === c.digger_id);
            } else {
              partnerDisplayName = "Support";
              partnerAvatarUrl = c.admin_avatar_url ?? null;
              partnerUserId = c.admin_id;
              partnerIsDigger = false;
            }
          } else {
            if (uid === c.consumer_id) {
              partnerDisplayName = (c.digger_handle || "Digger").trim() || "Digger";
              partnerAvatarUrl = c.digger_profile_image_url ?? null;
              partnerUserId = c.digger_id;
              partnerIsDigger = true;
            } else if (currentUserIsDigger) {
              partnerDisplayName = (c.consumer_full_name || "Client").trim() || "Client";
              partnerAvatarUrl = c.consumer_avatar_url ?? null;
              partnerUserId = c.consumer_id;
              partnerIsDigger = false;
            } else {
              // Fallback: pick the digger if present; else consumer.
              partnerUserId = c.digger_id || c.consumer_id || null;
              partnerIsDigger = Boolean(partnerUserId && c.digger_id && partnerUserId === c.digger_id);
              if (partnerIsDigger) {
                partnerDisplayName = (c.digger_handle || "Digger").trim() || "Digger";
                partnerAvatarUrl = c.digger_profile_image_url ?? null;
              } else {
                partnerDisplayName = (c.consumer_full_name || "Client").trim() || "Client";
                partnerAvatarUrl = c.consumer_avatar_url ?? null;
              }
            }
          }
          if (partnerUserId && partnerUserId !== uid) {
            if (partnerIsDigger) {
              partnerProfileUrl = getCanonicalDiggerProfilePath({
                handle: c.digger_handle,
                diggerId: partnerUserId,
              });
            } else {
              partnerProfileUrl = `/profile/${partnerUserId}`;
            }
          }
          const lastMessageFromMe = c.last_message_sender_id === uid;
          return {
            id: c.id,
            partnerDisplayName,
            partnerAvatarUrl,
            partnerProfileUrl,
            partnerJobTitle,
            gigId,
            consumerId: c.consumer_id ?? null,
            diggerId: c.digger_id ?? null,
            isCurrentUserDigger: currentUserIsDigger,
            lastMessageContent: c.last_message_content ?? null,
            lastMessageMetadata: (c as any).last_message_metadata ?? null,
            lastMessageFromMe,
            updatedAt: c.updated_at,
            unreadCount: typeof c.unread_count === "number" ? c.unread_count : Number(c.unread_count) || 0,
            muted: c.muted ?? false,
            isBlocked: c.is_blocked ?? false,
            partnerUserId: c.partner_user_id ?? partnerUserId ?? null,
          };
        });

        if (!cancelled) setConversations(list);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
      await load(true);

      const scheduleRefresh = () => {
        if (refreshTimeout) clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          load(false);
        }, 200);
      };
      refreshRef.current = scheduleRefresh;

      const messagesChannel = supabase
        .channel(`recent-conversations:messages:${currentUser.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          scheduleRefresh
        )
        .subscribe();

      const conversationsChannel = supabase
        .channel(`recent-conversations:conversations:${currentUser.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          scheduleRefresh
        )
        .subscribe();

      channelsRef.current = [messagesChannel, conversationsChannel];
    };

    setup();

    const onRefreshEvent = () => refreshRef.current();
    if (typeof window !== "undefined") {
      window.addEventListener("recent-conversations-refresh", onRefreshEvent);
    }

    return () => {
      cancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
      if (typeof window !== "undefined") {
        window.removeEventListener("recent-conversations-refresh", onRefreshEvent);
      }
    };
  }, [currentUser?.id]);

  return { conversations, loading };
}
