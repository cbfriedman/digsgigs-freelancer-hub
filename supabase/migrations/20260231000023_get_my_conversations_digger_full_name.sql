-- Return digger full name (and consumer full name) in get_my_conversations so floating chat header shows Digger's name, not username.
DROP FUNCTION IF EXISTS public.get_my_conversations();

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
  digger_full_name text,
  digger_profession text,
  digger_profile_image_url text,
  consumer_avatar_url text,
  consumer_full_name text,
  admin_avatar_url text,
  last_message_content text,
  last_message_sender_id uuid,
  last_message_metadata jsonb,
  unread_count bigint,
  muted boolean,
  is_blocked boolean,
  partner_user_id uuid
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
    p_digger.full_name AS digger_full_name,
    dp.profession AS digger_profession,
    dp.profile_image_url AS digger_profile_image_url,
    p_consumer.avatar_url AS consumer_avatar_url,
    p_consumer.full_name AS consumer_full_name,
    p_admin.avatar_url AS admin_avatar_url,
    lm.content AS last_message_content,
    lm.sender_id AS last_message_sender_id,
    lm.metadata AS last_message_metadata,
    COALESCE(uc.cnt, 0)::bigint AS unread_count,
    (SELECT EXISTS (SELECT 1 FROM public.conversation_mutes m WHERE m.user_id = auth.uid() AND m.conversation_id = c.id)) AS muted,
    (SELECT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE ub.blocker_id = auth.uid()
        AND ub.blocked_id = public.get_conversation_partner_user_id(c.id, auth.uid())
    )) AS is_blocked,
    public.get_conversation_partner_user_id(c.id, auth.uid()) AS partner_user_id
  FROM public.conversations c
  LEFT JOIN public.gigs g ON g.id = c.gig_id
  LEFT JOIN public.digger_profiles dp ON dp.id = c.digger_id
  LEFT JOIN public.profiles p_digger ON p_digger.id = dp.user_id
  LEFT JOIN public.profiles p_consumer ON p_consumer.id = c.consumer_id
  LEFT JOIN public.profiles p_admin ON p_admin.id = c.admin_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.sender_id, m.metadata
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cnt
    FROM public.messages m2
    WHERE m2.conversation_id = c.id
      AND m2.read_at IS NULL
      AND m2.sender_id != auth.uid()
  ) uc ON true
  WHERE public.can_access_conversation(auth.uid(), c.id)
  ORDER BY c.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_my_conversations() IS
  'Returns all conversations with last message, metadata, partner names and avatar URLs, unread count, muted, and is_blocked.';

GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
