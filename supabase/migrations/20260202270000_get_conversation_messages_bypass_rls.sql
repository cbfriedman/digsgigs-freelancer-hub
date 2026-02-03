-- Ensure get_conversation_messages returns all messages so admin sees messages sent by the user.
-- RLS on messages can prevent the admin from seeing rows where sender_id is the consumer;
-- we already verified access with can_access_conversation, so bypass RLS for this SELECT.

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

  -- Bypass RLS so both admin and consumer see all messages in the conversation
  SET LOCAL row_security = off;
  RETURN QUERY
  SELECT id, conversation_id, sender_id, content, created_at, read_at
  FROM public.messages
  WHERE conversation_id = _conversation_id
  ORDER BY created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_conversation_messages(uuid) IS
  'Returns all messages in a conversation. Caller must be a participant (or admin in admin convos). Bypasses RLS after access check so admin sees user messages.';
