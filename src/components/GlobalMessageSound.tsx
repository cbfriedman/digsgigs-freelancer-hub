import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { playNotificationSound } from "@/lib/notificationSound";

/**
 * Subscribes to new messages globally. When the current user receives a message
 * (on any page), plays the notification sound at max volume so they hear it even
 * outside the Messages box. Same behavior for both client (gigger) and freelancer (digger).
 */
export function GlobalMessageSound() {
  const { user } = useAuth();
  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
    };

    setup().then(() => {
      const channel = supabase
        .channel("global:messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as { conversation_id: string; sender_id: string };
            if (msg.sender_id === userIdRef.current) return;
            // Realtime only sends to clients who can SELECT the row (RLS), so we're the recipient — play same sound/volume for both client and freelancer
            playNotificationSound();
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  return null;
}
