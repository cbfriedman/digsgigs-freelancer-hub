/**
 * Hook for tracking profile email contacts from giggers to diggers
 * Records email actions and handles billing (1x click value = 75% of Google avg PPC)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailResult {
  success: boolean;
  emailId?: string;
  costCents?: number;
  costDollars?: number;
  diggerEmail?: string;
  error?: string;
}

export const useProfileEmailTracking = () => {
  const [isRecording, setIsRecording] = useState(false);

  const recordEmail = useCallback(async (
    diggerProfileId: string
  ): Promise<EmailResult> => {
    setIsRecording(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('record-profile-email', {
        body: {
          digger_profile_id: diggerProfileId,
        },
      });

      if (error) {
        console.error('Error recording email:', error);
        toast.error('Failed to record email action');
        return { success: false, error: error.message };
      }

      if (data.success) {
        toast.success(`Email contact initiated - Cost: $${data.costDollars.toFixed(2)}`);
        return {
          success: true,
          emailId: data.emailId,
          costCents: data.costCents,
          costDollars: data.costDollars,
          diggerEmail: data.diggerEmail,
        };
      }

      return { success: false, error: 'Unknown error' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record email';
      console.error('Error recording email:', err);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsRecording(false);
    }
  }, []);

  return {
    recordEmail,
    isRecording,
  };
};

export default useProfileEmailTracking;
