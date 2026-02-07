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
      try {
        const state = channel.presenceState() ?? {};
        const online = new Set<string>();
        Object.values(state).forEach((presences: unknown) => {
          const list = Array.isArray(presences) ? presences : [];
          list.forEach((p: Record<string, unknown>) => {
            const uid = p?.user_id ?? (p?.payload as Record<string, unknown>)?.user_id;
            if (typeof uid === 'string') online.add(uid);
          });
        });
        setOnlineUserIds(online);
      } catch {
        // ignore
      }
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
            setTimeout(refreshOnline, 200);
            setTimeout(refreshOnline, 500);
            setTimeout(refreshOnline, 1200);
          }
        });
    };
    setup();

    // Periodic refresh so online/offline updates in real time
    const interval = setInterval(refreshOnline, 2000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshOnline();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
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

    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence();
          if (heartbeat) clearInterval(heartbeat);
          heartbeat = setInterval(trackPresence, 20_000);
        }
      });
    };
    setup();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        trackPresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (heartbeat) clearInterval(heartbeat);
      void channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
