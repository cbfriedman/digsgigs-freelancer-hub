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
    const channel = supabase.channel('digger-presence', {
      config: { presence: { key: user?.id ?? observerKeyRef.current } },
    });

    const refreshOnline = () => {
      const state = channel.presenceState();
      const online = new Set<string>();

      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (presence.digger_id) {
            online.add(presence.digger_id);
          }
        });
      });

      setOnlineDiggers(online);
    };

    const refreshOnlineSafe = () => {
      try {
        refreshOnline();
      } catch {
        // ignore
      }
    };

    channel
      .on('presence', { event: 'sync' }, refreshOnlineSafe)
      .on('presence', { event: 'join' }, refreshOnlineSafe)
      .on('presence', { event: 'leave' }, refreshOnlineSafe)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user && diggerId) {
          // Skip if in sign-in OTP flow
          const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
          if (isInOtpFlow) {
            return;
          }

          // Track this digger's presence if it's their own profile
          try {
            const { data: diggerProfile, error } = await supabase
              .from('digger_profiles')
              .select('id')
              .eq('user_id', user.id)
              .single();

            // Handle 406 or other errors gracefully
            if (error) {
              if (error.code === 'PGRST116' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
                return;
              }
              console.warn('Error fetching digger profile for presence:', error);
              return;
            }

            if (diggerProfile && diggerProfile.id === diggerId) {
              await channel.track({
                digger_id: diggerId,
                online_at: new Date().toISOString(),
              });
            }
          } catch (error) {
            // Silently fail - presence tracking is not critical
            console.warn('Error setting up digger presence:', error);
          }
        }
      });

    // Real-time: periodic refresh so online/offline updates even if join/leave is missed
    const interval = setInterval(refreshOnlineSafe, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, diggerId]);

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
      try {
        // First check if user has digger role - use RPC function to avoid RLS recursion
        let hasDiggerRole = false;
        
        try {
          const { data: rolesData, error: rolesError } = await (supabase
            .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
          
          if (!rolesError && rolesData) {
            hasDiggerRole = (rolesData as any[]).some((r: any) => r.app_role === 'digger' && r.is_active);
          } else if (rolesError) {
            // RPC function might not exist - fallback to checking userRoles from context
            // But we can't access context here, so just skip presence tracking
            console.warn('Could not check digger role for presence tracking:', rolesError);
            return;
          }
        } catch (rpcError) {
          console.warn('RPC function get_user_app_roles_safe failed:', rpcError);
          return;
        }

        if (!hasDiggerRole) {
          // User doesn't have digger role, no need to query profiles
          return;
        }

        const { data: diggerProfile, error } = await supabase
          .from('digger_profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        // Handle 406 or other errors gracefully - user might not have digger profile
        if (error) {
          if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
            // User doesn't have digger profile or query blocked - this is OK
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
              // Heartbeat so we stay visible as online in real time
              if (heartbeatRef.current) clearInterval(heartbeatRef.current);
              heartbeatRef.current = setInterval(trackPresence, 25_000);
            }
          });
        }
      } catch (error) {
        // Silently fail - presence tracking is not critical
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
