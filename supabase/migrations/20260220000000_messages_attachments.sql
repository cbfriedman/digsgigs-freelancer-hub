-- Add attachments to messages: array of { name, url, type } for display and download.
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.messages.attachments IS 'Array of { name, url, type } for file/image attachments.';

-- Allow send_message with optional content when attachments are present.
CREATE OR REPLACE FUNCTION public.send_message(_conversation_id uuid, _content text, _attachments jsonb DEFAULT '[]'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_id uuid;
  _message_id uuid;
  _partner_id uuid;
  _has_content boolean;
  _has_attachments boolean;
BEGIN
  _sender_id := auth.uid();
  IF _sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _conversation_id IS NULL THEN
    RAISE EXCEPTION 'conversation_id is required';
  END IF;

  _has_content := _content IS NOT NULL AND trim(_content) <> '';
  _has_attachments := _attachments IS NOT NULL AND jsonb_array_length(_attachments) > 0;

  IF NOT _has_content AND NOT _has_attachments THEN
    RAISE EXCEPTION 'Message must have content or at least one attachment';
  END IF;

  IF NOT public.can_access_conversation(_sender_id, _conversation_id) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  _partner_id := public.get_conversation_partner_user_id(_conversation_id, _sender_id);
  IF _partner_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.user_blocks WHERE blocker_id = _partner_id AND blocked_id = _sender_id) THEN
      RAISE EXCEPTION 'You cannot send messages to this conversation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_blocks WHERE blocker_id = _sender_id AND blocked_id = _partner_id) THEN
      RAISE EXCEPTION 'You have blocked this user. Unblock to send messages.';
    END IF;
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, attachments)
  VALUES (_conversation_id, _sender_id, coalesce(trim(_content), ''), coalesce(_attachments, '[]'::jsonb))
  RETURNING id INTO _message_id;

  RETURN _message_id;
END;
$$;

COMMENT ON FUNCTION public.send_message(uuid, text, jsonb) IS
  'Inserts a message with optional attachments. Blocks sending if the recipient has blocked the sender.';

-- Return attachments from get_conversation_messages.
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
  SELECT id, conversation_id, sender_id, content, created_at, read_at, attachments
  FROM public.messages
  WHERE conversation_id = _conversation_id
  ORDER BY created_at ASC;
END;
$$;
