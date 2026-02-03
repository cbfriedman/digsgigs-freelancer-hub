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
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences: unknown) => {
          const list = Array.isArray(presences) ? presences : [];
          list.forEach((p: Record<string, unknown>) => {
            const did = p?.digger_id ?? (p?.payload as Record<string, unknown>)?.digger_id;
            if (typeof did === 'string') online.add(did);
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
            setTimeout(refreshOnline, 300);
            setTimeout(refreshOnline, 1000);
          }
        });
    };
    setup();

    // Periodic refresh so online/offline updates in real time
    const interval = setInterval(refreshOnline, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
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

    const trackPresence = () => {
      if (diggerProfileId) {
        channel.track({
          digger_id: diggerProfileId,
          online_at: new Date().toISOString(),
        });
      }
    };

    const setupPresence = async () => {
      // Set auth before any realtime action so presence is accepted
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      try {
        // First check if user has digger role - use RPC function to avoid RLS recursion
        let hasDiggerRole = false;
        
        try {
          const { data: rolesData, error: rolesError } = await (supabase
            .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
          
          if (!rolesError && rolesData) {
            hasDiggerRole = (rolesData as any[]).some((r: any) => r.app_role === 'digger' && r.is_active);
          } else if (rolesError) {
            console.warn('Could not check digger role for presence tracking:', rolesError);
            return;
          }
        } catch (rpcError) {
          console.warn('RPC function get_user_app_roles_safe failed:', rpcError);
          return;
        }

        if (!hasDiggerRole) return;

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
          diggerProfileId = diggerProfile.id;
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && diggerProfileId) {
              await channel.track({
                digger_id: diggerProfileId,
                online_at: new Date().toISOString(),
              });
              if (heartbeatRef.current) clearInterval(heartbeatRef.current);
              heartbeatRef.current = setInterval(trackPresence, 25_000);
            }
          });
        }
      } catch (error) {
        console.warn('Error setting up digger presence:', error);
      }
    };

    setupPresence();

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [user]);
};
