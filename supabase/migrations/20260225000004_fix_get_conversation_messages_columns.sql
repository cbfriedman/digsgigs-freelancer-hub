-- Fix get_conversation_messages: must return all columns of messages table
-- The moderation migration added content_normalized, moderation_status, visible_to_sender, visible_to_recipient, recipient_id.
-- RETURNS SETOF public.messages requires the SELECT to match the table structure exactly.

CREATE OR REPLACE FUNCTION public.get_conversation_messages(_conversation_id uuid)
RETURNS SETOF public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _conversation_id IS NULL THEN
    RAISE EXCEPTION 'conversation_id is required';
  END IF;
  IF NOT public.can_access_conversation(auth.uid(), _conversation_id) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  SET LOCAL row_security = off;
  RETURN QUERY
  SELECT m.*
  FROM public.messages m
  WHERE m.conversation_id = _conversation_id
  ORDER BY m.created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_conversation_messages(uuid) IS
  'Returns all messages in a conversation. Caller must be a participant (or admin in admin convos). Bypasses RLS after access check.';
