-- Allow participants to delete their own conversations (messages are deleted via ON DELETE CASCADE).
CREATE POLICY "Participants can delete conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (public.can_access_conversation(auth.uid(), id));

COMMENT ON POLICY "Participants can delete conversations" ON public.conversations IS
  'Participants (consumer, digger, or admin) can delete a conversation; messages cascade.';
