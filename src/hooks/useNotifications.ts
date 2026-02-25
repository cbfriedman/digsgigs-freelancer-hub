import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

async function enrichWithActorAvatars(notifications: Notification[]): Promise<Notification[]> {
  const actorIds = [...new Set(
    notifications
      .map(n => n.metadata?.actor_id)
      .filter((id): id is string => typeof id === "string")
  )];
  if (actorIds.length === 0) return notifications;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .in("id", actorIds);

  const avatarByActorId = new Map<string, string | null>();
  (profiles || []).forEach(p => avatarByActorId.set(p.id, p.avatar_url ?? null));

  return notifications.map(n => ({
    ...n,
    actor_avatar_url: n.metadata?.actor_id ? avatarByActorId.get(n.metadata.actor_id) ?? null : undefined,
  }));
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  metadata: { actor_id?: string; [key: string]: unknown } | null;
  /** Set by hook from profiles for dropdown avatar */
  actor_avatar_url?: string | null;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    fetchNotifications();
    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const list = (data || []) as Notification[];
      const enriched = await enrichWithActorAvatars(list);
      setNotifications(enriched);
      setUnreadCount(enriched.filter(n => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('New notification received:', payload);
          const raw = payload.new as Notification;
          const [enriched] = await enrichWithActorAvatars([raw]);
          setNotifications(prev => [enriched, ...prev]);
          setUnreadCount(prev => prev + 1);
          window.dispatchEvent(new CustomEvent('app:new-notification', { detail: enriched }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Notification updated:', payload);
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? { ...updatedNotification, actor_avatar_url: n.actor_avatar_url } : n)
          );
          
          // Recalculate unread count
          setNotifications(current => {
            setUnreadCount(current.filter(n => !n.read).length);
            return current;
          });
        }
      )
      .subscribe();

    setChannel(newChannel);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const clearAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: fetchNotifications,
  };
};
