-- Create admin conversation via RPC so insert is not blocked by RLS.
-- Only admins can call this; the function runs as definer and inserts the row.

CREATE OR REPLACE FUNCTION public.create_admin_conversation(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _conversation_id uuid;
BEGIN
  _admin_id := auth.uid();
  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_admin(_admin_id) THEN
    RAISE EXCEPTION 'Only admins can create admin conversations';
  END IF;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  INSERT INTO public.conversations (admin_id, consumer_id, gig_id, digger_id)
  VALUES (_admin_id, target_user_id, NULL, NULL)
  RETURNING id INTO _conversation_id;

  RETURN _conversation_id;
END;
$$;

COMMENT ON FUNCTION public.create_admin_conversation(uuid) IS
  'Creates an admin support conversation between the current admin and target user. Only callable by admins.';

GRANT EXECUTE ON FUNCTION public.create_admin_conversation(uuid) TO authenticated;
