import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useDiggerPresence = (diggerId?: string) => {
  const [onlineDiggers, setOnlineDiggers] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    const channel = supabase.channel('digger-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
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
      })
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

    return () => {
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

  useEffect(() => {
    if (!user) return;

    // Skip if in sign-in OTP flow or on register page
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    const isRegisterPage = window.location.pathname === '/register';
    
    if (isInOtpFlow || isRegisterPage) {
      return;
    }

    const channel = supabase.channel('digger-presence');
    let diggerProfileId: string | null = null;

    const setupPresence = async () => {
      try {
        const { data: diggerProfile, error } = await supabase
          .from('digger_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        // Handle 406 or other errors gracefully - user might not have digger profile
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
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
      supabase.removeChannel(channel);
    };
  }, [user]);
};
