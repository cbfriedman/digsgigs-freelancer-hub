/**
 * Hook for tracking profile calls from giggers to diggers
 * Records calls and handles billing (100% of Google high PPC)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CallResult {
  success: boolean;
  callId?: string;
  costCents?: number;
  costDollars?: number;
  error?: string;
}

export const useProfileCallTracking = () => {
  const [isRecording, setIsRecording] = useState(false);

  const recordCall = useCallback(async (
    diggerProfileId: string,
    callDurationSeconds?: number
  ): Promise<CallResult> => {
    setIsRecording(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('record-profile-call', {
        body: {
          digger_profile_id: diggerProfileId,
          call_duration_seconds: callDurationSeconds,
        },
      });

      if (error) {
        console.error('Error recording call:', error);
        toast.error('Failed to record call');
        return { success: false, error: error.message };
      }

      if (data.success) {
        toast.success(`Call recorded - Cost: $${data.costDollars.toFixed(2)}`);
        return {
          success: true,
          callId: data.callId,
          costCents: data.costCents,
          costDollars: data.costDollars,
        };
      }

      return { success: false, error: 'Unknown error' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record call';
      console.error('Error recording call:', err);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsRecording(false);
    }
  }, []);

  return {
    recordCall,
    isRecording,
  };
};

export default useProfileCallTracking;
