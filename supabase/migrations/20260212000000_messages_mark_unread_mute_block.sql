-- Mark conversation as unread (set read_at = NULL for messages from the other party)
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_unread(_conversation_id uuid)
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
  SET read_at = NULL
  WHERE conversation_id = _conversation_id
    AND sender_id <> auth.uid();
END;
$$;

COMMENT ON FUNCTION public.mark_conversation_messages_unread(uuid) IS
  'Marks all messages not sent by the current user as unread. Caller must be a participant.';

GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_unread(uuid) TO authenticated;

-- Per-user mute per conversation (no email/in-app notification preference for that conversation)
CREATE TABLE IF NOT EXISTS public.conversation_mutes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

ALTER TABLE public.conversation_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mutes"
  ON public.conversation_mutes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_mutes_user ON public.conversation_mutes(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_mutes_conversation ON public.conversation_mutes(conversation_id);

COMMENT ON TABLE public.conversation_mutes IS 'User has muted this conversation (e.g. no notification emails).';

-- Toggle mute: if muted, unmute and return false; else mute and return true.
CREATE OR REPLACE FUNCTION public.toggle_conversation_mute(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _was_muted boolean;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.can_access_conversation(_uid, _conversation_id) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.conversation_mutes
    WHERE user_id = _uid AND conversation_id = _conversation_id
  ) INTO _was_muted;

  IF _was_muted THEN
    DELETE FROM public.conversation_mutes
    WHERE user_id = _uid AND conversation_id = _conversation_id;
    RETURN false;
  ELSE
    INSERT INTO public.conversation_mutes (user_id, conversation_id)
    VALUES (_uid, _conversation_id);
    RETURN true;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.toggle_conversation_mute(uuid) IS 'Toggle mute for current user on this conversation. Returns true if now muted, false if now unmuted.';

GRANT EXECUTE ON FUNCTION public.toggle_conversation_mute(uuid) TO authenticated;

-- User blocks (blocker cannot message blocked; optionally hide conversation or show "Blocked")
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks"
  ON public.user_blocks FOR ALL
  TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

COMMENT ON TABLE public.user_blocks IS 'Blocked users: blocker_id has blocked blocked_id.';

-- Get partner user_id for a conversation and current user (for block).
CREATE OR REPLACE FUNCTION public.get_conversation_partner_user_id(_conversation_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN c.consumer_id = _user_id AND c.admin_id IS NOT NULL THEN c.admin_id
    WHEN c.consumer_id = _user_id AND c.digger_id IS NOT NULL THEN (SELECT user_id FROM public.digger_profiles WHERE id = c.digger_id LIMIT 1)
    WHEN c.consumer_id = _user_id THEN NULL
    WHEN dp.user_id = _user_id AND c.admin_id IS NOT NULL THEN c.admin_id
    WHEN dp.user_id = _user_id THEN c.consumer_id
    WHEN c.admin_id = _user_id THEN c.consumer_id
    ELSE NULL
  END
  FROM public.conversations c
  LEFT JOIN public.digger_profiles dp ON c.digger_id = dp.id
  WHERE c.id = _conversation_id
  LIMIT 1;
$$;

-- Block the partner in this conversation. Idempotent.
CREATE OR REPLACE FUNCTION public.block_conversation_partner(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _partner_id uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.can_access_conversation(_uid, _conversation_id) THEN
    RAISE EXCEPTION 'You do not have access to this conversation';
  END IF;

  _partner_id := public.get_conversation_partner_user_id(_conversation_id, _uid);
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine conversation partner';
  END IF;

  INSERT INTO public.user_blocks (blocker_id, blocked_id)
  VALUES (_uid, _partner_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.block_conversation_partner(uuid) IS 'Block the other participant in this conversation. Idempotent.';

GRANT EXECUTE ON FUNCTION public.block_conversation_partner(uuid) TO authenticated;

-- Unblock a user (by user id).
CREATE OR REPLACE FUNCTION public.unblock_user(_blocked_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.user_blocks
  WHERE blocker_id = auth.uid() AND blocked_id = _blocked_user_id;
END;
$$;

COMMENT ON FUNCTION public.unblock_user(uuid) IS 'Unblock a user.';

GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;
