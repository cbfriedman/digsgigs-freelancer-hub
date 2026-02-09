-- Ensure both client (gigger) and freelancer (digger) can SELECT messages for Realtime delivery.
-- Realtime only sends postgres_changes to clients who can SELECT the row; using
-- can_access_conversation (SECURITY DEFINER) avoids RLS subquery issues so both sides hear the notification.

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (public.can_access_conversation(auth.uid(), conversation_id));

COMMENT ON POLICY "Users can view messages in their conversations" ON public.messages IS
  'Client and freelancer can view messages in conversations they participate in; used for Realtime and UI.';
