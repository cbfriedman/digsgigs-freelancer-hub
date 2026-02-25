-- Add metadata column for system messages (award events, etc.)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

COMMENT ON COLUMN public.messages.metadata IS 'For system messages: { _type: "award_event", event: "awarded"|"accepted"|"declined", bid_id, gig_id, amount, ... }';

-- Include metadata in get_conversation_messages
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
  SELECT id, conversation_id, sender_id, content, created_at, read_at, attachments, metadata
  FROM public.messages
  WHERE conversation_id = _conversation_id
  ORDER BY created_at ASC;
END;
$$;
