-- Add avatar_url to profiles so admin can see user (consumer) photo in Messages.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.profiles.avatar_url IS 'Profile/avatar image URL; often synced from auth OAuth (e.g. Google) or set by user.';

-- Sync avatar from auth on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Backfill avatar_url for existing users from auth.users
UPDATE public.profiles p
SET avatar_url = a.raw_user_meta_data->>'avatar_url'
FROM auth.users a
WHERE a.id = p.id
  AND (p.avatar_url IS NULL OR p.avatar_url = '')
  AND a.raw_user_meta_data->>'avatar_url' IS NOT NULL
  AND a.raw_user_meta_data->>'avatar_url' != '';

-- Return consumer and admin avatar URLs from get_my_conversations so Messages can show partner photo.
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
  last_message_sender_id uuid
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
    lm.sender_id AS last_message_sender_id
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
  WHERE public.can_access_conversation(auth.uid(), c.id)
  ORDER BY c.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_my_conversations() IS
  'Returns all conversations with last message and partner avatar URLs (digger, consumer, admin).';

GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
