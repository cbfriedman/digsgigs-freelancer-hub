import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const USER_PRESENCE_CHANNEL = 'user-presence';

/** Returns the set of user IDs currently online (tracked on user-presence channel). */
export function useUserPresence() {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel(USER_PRESENCE_CHANNEL);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences: { user_id?: string }[]) => {
          presences.forEach((p) => {
            if (p.user_id) online.add(p.user_id);
          });
        });
        setOnlineUserIds(online);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { onlineUserIds };
}

/** Tracks the current user's presence so they appear online to others. Call once in app root. */
export function useTrackUserPresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    const isRegisterPage = window.location.pathname === '/register';
    if (isInOtpFlow || isRegisterPage) return;

    const channel = supabase.channel(USER_PRESENCE_CHANNEL);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
