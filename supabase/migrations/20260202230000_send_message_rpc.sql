-- Send a message via RPC so insert is allowed for all conversation types (including admin).
-- Checks can_access_conversation then inserts as definer.

CREATE OR REPLACE FUNCTION public.send_message(_conversation_id uuid, _content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_id uuid;
  _message_id uuid;
BEGIN
  _sender_id := auth.uid();
  IF _sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _conversation_id IS NULL OR _content IS NULL OR trim(_content) = '' THEN
    RAISE EXCEPTION 'conversation_id and content are required';
  END IF;
  IF NOT public.can_access_conversation(_sender_id, _conversation_id) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES (_conversation_id, _sender_id, trim(_content))
  RETURNING id INTO _message_id;

  RETURN _message_id;
END;
$$;

COMMENT ON FUNCTION public.send_message(uuid, text) IS
  'Inserts a message in a conversation. Caller must be a participant (or admin in admin convos).';

GRANT EXECUTE ON FUNCTION public.send_message(uuid, text) TO authenticated;
