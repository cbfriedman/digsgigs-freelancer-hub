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
          // Track this digger's presence if it's their own profile
          const { data: diggerProfile } = await supabase
            .from('digger_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (diggerProfile && diggerProfile.id === diggerId) {
            await channel.track({
              digger_id: diggerId,
              online_at: new Date().toISOString(),
            });
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

    const channel = supabase.channel('digger-presence');
    let diggerProfileId: string | null = null;

    const setupPresence = async () => {
      const { data: diggerProfile } = await supabase
        .from('digger_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

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
    };

    setupPresence();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
