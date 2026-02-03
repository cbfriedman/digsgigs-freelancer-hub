-- Add unread_count per conversation so Messages list can show bold + badge; header already uses useUnreadMessagesCount.
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
  digger_profession text,
  digger_profile_image_url text,
  consumer_avatar_url text,
  admin_avatar_url text,
  last_message_content text,
  last_message_sender_id uuid,
  unread_count bigint
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
    dp.profession AS digger_profession,
    dp.profile_image_url AS digger_profile_image_url,
    p_consumer.avatar_url AS consumer_avatar_url,
    p_admin.avatar_url AS admin_avatar_url,
    lm.content AS last_message_content,
    lm.sender_id AS last_message_sender_id,
    COALESCE(uc.cnt, 0)::bigint AS unread_count
  FROM public.conversations c
  LEFT JOIN public.gigs g ON g.id = c.gig_id
  LEFT JOIN public.digger_profiles dp ON dp.id = c.digger_id
  LEFT JOIN public.profiles p_consumer ON p_consumer.id = c.consumer_id
  LEFT JOIN public.profiles p_admin ON p_admin.id = c.admin_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.sender_id
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
  'Returns all conversations with last message, partner avatar URLs, and unread message count.';

GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
