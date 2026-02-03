-- Realtime only broadcasts to clients who can SELECT the row. Use a SECURITY DEFINER
-- check so the admin read is not blocked when Realtime evaluates RLS.

CREATE OR REPLACE FUNCTION public.conversation_admin_can_read_message(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND c.admin_id IS NOT NULL
      AND c.admin_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.conversation_admin_can_read_message(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins can view all messages in their admin conversations" ON public.messages;
CREATE POLICY "Admins can view all messages in their admin conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (public.conversation_admin_can_read_message(conversation_id));
