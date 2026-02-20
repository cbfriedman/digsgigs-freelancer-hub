-- Allow admins to view all conversations and all messages (read-only) for support and oversight.

CREATE POLICY "Admins can view all conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'::user_app_role));

COMMENT ON POLICY "Admins can view all conversations" ON public.conversations IS
  'Read-only: admins can list and inspect all chats for support.';
COMMENT ON POLICY "Admins can view all messages" ON public.messages IS
  'Read-only: admins can view full chat history for any conversation.';
