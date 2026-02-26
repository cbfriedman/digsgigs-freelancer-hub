/**
 * Hook for client-side message moderation pre-check and send via Edge Function
 */

import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { clientPreCheck } from "@/lib/messageModeration/clientPreCheck";

export interface UseMessageModerationOptions {
  conversationId: string | null;
  onSuccess?: (messageId: string) => void;
  onBlocked?: (message: string, retryAllowed: boolean) => void;
  onError?: (error: Error) => void;
}

export interface SendMessageParams {
  content: string;
  attachments?: { name: string; path: string; type: string }[];
  metadata?: Record<string, unknown>;
}

export interface UseMessageModerationReturn {
  sendMessage: (params: SendMessageParams) => Promise<string | null>;
  preCheck: (content: string) => { hasWarning: boolean; warningMessage?: string };
  isSending: boolean;
}

export function useMessageModeration({
  conversationId,
  onSuccess,
  onBlocked,
  onError,
}: UseMessageModerationOptions): UseMessageModerationReturn {
  const [isSending, setIsSending] = useState(false);

  const preCheck = useCallback((content: string) => {
    return clientPreCheck(content);
  }, []);

  const sendMessage = useCallback(
    async ({ content, attachments = [], metadata }: SendMessageParams): Promise<string | null> => {
      if (!conversationId) {
        onError?.(new Error("No conversation selected"));
        return null;
      }

      setIsSending(true);
      try {
        const data = await invokeEdgeFunction<{
          ok: boolean;
          decision?: string;
          message_id?: string;
          user_facing_message?: string;
          retry_allowed?: boolean;
          safe_reason_codes?: string[];
        }>(supabase, "moderate-and-send-message", {
          body: {
            conversation_id: conversationId,
            content: content.trim(),
            attachments,
            metadata,
          },
        });

        if (data.ok && data.message_id) {
          onSuccess?.(data.message_id);
          return data.message_id;
        }

        if (!data.ok && data.user_facing_message) {
          onBlocked?.(data.user_facing_message, data.retry_allowed ?? false);
          return null;
        }

        onError?.(new Error("Unexpected response from server"));
        return null;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, onSuccess, onBlocked, onError]
  );

  return { sendMessage, preCheck, isSending };
}
