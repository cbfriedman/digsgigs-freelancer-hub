import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { playNotificationSound } from "@/lib/notificationSound";

// Single channel for the whole app so the same INSERT never triggers two callbacks
let globalChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Subscribes to new messages globally. When the current user receives a message
 * (on any page), plays the notification sound once. Dedupe by message id is in notificationSound.
 */
export function GlobalMessageSound() {
  const { user } = useAuth();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (globalChannel) return;

    let cancelled = false;
    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;
      if (globalChannel) return;

      const channel = supabase
        .channel("global:messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as { id?: string; sender_id?: string; metadata?: { _type?: string } };
            if (msg.sender_id === userIdRef.current) return;
            if (msg.metadata?._type === "award_event") return;
            playNotificationSound(msg.id != null ? String(msg.id) : undefined);
          }
        )
        .subscribe();

      globalChannel = channel;
    };

    setup();

    return () => {
      cancelled = true;
      if (globalChannel) {
        supabase.removeChannel(globalChannel);
        globalChannel = null;
      }
    };
  }, [user?.id]);

  return null;
}
