-- Ensure admins see their conversations: list via RPC (bypasses RLS).
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
