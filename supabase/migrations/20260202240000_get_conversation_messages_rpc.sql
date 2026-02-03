-- List conversations for the current user (including admin conversations). Bypasses RLS.
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  id uuid,
  gig_id uuid,
  consumer_id uuid,
  digger_id uuid,
  admin_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  gig_title text,
  digger_handle text,
  digger_profession text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.gig_id,
    c.consumer_id,
    c.digger_id,
    c.admin_id,
    c.created_at,
    c.updated_at,
    g.title AS gig_title,
    dp.handle AS digger_handle,
    dp.profession AS digger_profession
  FROM public.conversations c
  LEFT JOIN public.gigs g ON g.id = c.gig_id
  LEFT JOIN public.digger_profiles dp ON dp.id = c.digger_id
  WHERE public.can_access_conversation(auth.uid(), c.id)
  ORDER BY c.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_my_conversations() IS
  'Returns all conversations the current user can access (including admin support convos).';

GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

-- Load messages via RPC so admin and user both see all messages in the conversation.
-- Bypasses RLS after checking can_access_conversation.

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

  RETURN QUERY
  SELECT id, conversation_id, sender_id, content, created_at, read_at
  FROM public.messages
  WHERE conversation_id = _conversation_id
  ORDER BY created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_conversation_messages(uuid) IS
  'Returns all messages in a conversation. Caller must be a participant (or admin in admin convos).';

GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid) TO authenticated;

-- Mark messages in a conversation as read (for current user as recipient).
-- Allows admin to mark user's messages as read and vice versa.
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.can_access_conversation(auth.uid(), _conversation_id) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = _conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.mark_conversation_messages_read(uuid) IS
  'Marks all messages not sent by the current user as read. Caller must be a participant.';

GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read(uuid) TO authenticated;
