import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const USER_PRESENCE_CHANNEL = 'user-presence';

/** Returns the set of user IDs currently online (tracked on user-presence channel). */
export function useUserPresence() {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const observerKeyRef = useRef<string>(
    (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );

  useEffect(() => {
    let mounted = true;
    const channel = supabase.channel(USER_PRESENCE_CHANNEL, {
      config: { presence: { key: observerKeyRef.current } },
    });

    const refreshOnline = () => {
      if (!mounted) return;
      const state = channel.presenceState();
      const online = new Set<string>();
      Object.values(state).forEach((presences) => {
        (presences as Array<{ user_id?: string }>).forEach((p) => {
          if (p.user_id) online.add(p.user_id);
        });
      });
      setOnlineUserIds(online);
    };

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      channel
        .on('presence', { event: 'sync' }, refreshOnline)
        .on('presence', { event: 'join' }, refreshOnline)
        .on('presence', { event: 'leave' }, refreshOnline)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            refreshOnline();
            setTimeout(refreshOnline, 500);
          }
        });
    };
    setup();

    // Periodic refresh so online/offline updates in real time even if join/leave is missed
    const interval = setInterval(refreshOnline, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
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

    const channel = supabase.channel(USER_PRESENCE_CHANNEL, {
      config: { presence: { key: user.id } },
    });

    const trackPresence = () => {
      channel.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
      });
    };

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }
        await trackPresence();
      }
    });

    const heartbeat = setInterval(() => {
      trackPresence();
    }, 25_000);

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
