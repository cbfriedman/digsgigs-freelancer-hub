import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useDiggerPresence = (diggerId?: string) => {
  const [onlineDiggers, setOnlineDiggers] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const observerKeyRef = useRef<string>(
    (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );

  useEffect(() => {
    let mounted = true;
    const channel = supabase.channel('digger-presence', {
      config: { presence: { key: observerKeyRef.current } },
    });

    const refreshOnline = () => {
      if (!mounted) return;
      try {
        const state = (channel.presenceState() ?? {}) as Record<string, unknown[]>;
        const online = new Set<string>();
        Object.values(state ?? {}).forEach((presences: unknown) => {
          const list = Array.isArray(presences) ? presences : [];
          list.forEach((p: unknown) => {
            const row = p as Record<string, unknown>;
            const raw =
              row?.digger_id ??
              (row?.payload as Record<string, unknown> | undefined)?.digger_id;
            const did = typeof raw === 'string' ? raw : (raw != null ? String(raw) : null);
            if (did && did.length > 0) online.add(did);
          });
        });
        setOnlineDiggers(online);
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
    const interval = setInterval(refreshOnline, 1500);

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

  return {
    isOnline: diggerId ? onlineDiggers.has(diggerId) : false,
    onlineDiggers,
  };
};

// Hook for tracking current digger's presence globally
export const useTrackDiggerPresence = () => {
  const { user } = useAuth();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    // Skip if in sign-in OTP flow or on register page
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    const isRegisterPage = window.location.pathname === '/register';
    
    if (isInOtpFlow || isRegisterPage) {
      return;
    }

    const channel = supabase.channel('digger-presence', {
      config: { presence: { key: user.id } },
    });
    let diggerProfileId: string | null = null;
    let isSubscribed = false;

    const trackPresence = () => {
      if (!isSubscribed || !diggerProfileId) return;
      try {
        channel.track({
          digger_id: diggerProfileId,
          online_at: new Date().toISOString(),
        });
      } catch {
        // only track after channel is SUBSCRIBED
      }
    };

    const setupPresence = async () => {
      // Set auth before any realtime action so presence is accepted
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      try {
        // Resolve digger profile id: prefer RPC role check, fallback to direct digger_profiles lookup
        const { data: diggerProfile, error } = await supabase
          .from('digger_profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
            return;
          }
          console.warn('Error fetching digger profile for presence tracking:', error);
          return;
        }

        if (diggerProfile) {
          // Optional: only track if user has digger app role (when RPC is available)
          try {
            const { data: rolesData, error: rolesError } = await (supabase
              .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
            if (!rolesError && rolesData) {
              const hasDiggerRole = (rolesData as any[]).some((r: any) => r.app_role === 'digger' && r.is_active);
              if (!hasDiggerRole) return;
            }
          } catch {
            // RPC missing or failed: still track presence so online status works
          }
          diggerProfileId = diggerProfile.id;
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED' && diggerProfileId) {
              isSubscribed = true;
              channel.track({
                digger_id: diggerProfileId,
                online_at: new Date().toISOString(),
              }).catch(() => {});
              if (heartbeatRef.current) clearInterval(heartbeatRef.current);
              heartbeatRef.current = setInterval(trackPresence, 20_000);
            }
          });
        }
      } catch (error) {
        console.warn('Error setting up digger presence:', error);
      }
    };

    setupPresence();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        trackPresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Avoid untrack() - it can throw "push presence before joining" if the
      // server hasn't finished processing our join. removeChannel() cleans up.
      supabase.removeChannel(channel);
    };
  }, [user]);
};
