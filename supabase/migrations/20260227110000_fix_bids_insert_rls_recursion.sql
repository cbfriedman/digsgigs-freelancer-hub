-- Fix infinite recursion in policy for relation "bids".
-- Cause: bids INSERT policy uses (SELECT id FROM digger_profiles WHERE user_id = auth.uid()).
-- That triggers RLS on digger_profiles; "Giggers can view matched digger profiles" calls
-- gigger_has_access_to_digger() which SELECTs from bids, causing recursion.
-- Fix: use a SECURITY DEFINER function to resolve current user's digger id without RLS.

-- 1) Helper: return current user's digger_profile id (bypasses RLS).
CREATE OR REPLACE FUNCTION public.get_my_digger_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_digger_id() IS
  'Returns the current user''s digger_profile id. Used by bids INSERT policy to avoid RLS recursion via digger_profiles.';

GRANT EXECUTE ON FUNCTION public.get_my_digger_id() TO authenticated;

-- 2) Replace bids INSERT policy to use the helper instead of a subquery that triggers digger_profiles RLS.
DROP POLICY IF EXISTS "Only diggers can create bids" ON public.bids;

CREATE POLICY "Only diggers can create bids"
  ON public.bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_app_role(auth.uid(), 'digger')
    AND digger_id = public.get_my_digger_id()
  );

COMMENT ON POLICY "Only diggers can create bids" ON public.bids IS
  'Restricts bid creation to users with the digger role whose digger_id matches their profile. Uses get_my_digger_id() to avoid RLS recursion.';
