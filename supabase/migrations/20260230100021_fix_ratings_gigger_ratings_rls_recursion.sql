-- Fix infinite recursion in RLS: ratings policy checks gigger_ratings, and gigger_ratings
-- policy checks ratings. Use SECURITY DEFINER helpers so the mutual-reveal check
-- reads the other table without triggering its RLS.

-- 1) Helper: true if a gigger_rating exists for (gig_id, consumer_id, digger_id).
--    Runs with definer rights so the SELECT bypasses RLS on gigger_ratings.
CREATE OR REPLACE FUNCTION public.exists_gigger_rating_for_reveal(
  p_gig_id uuid,
  p_consumer_id uuid,
  p_digger_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gigger_ratings gr
    WHERE gr.gig_id = p_gig_id
      AND gr.consumer_id = p_consumer_id
      AND gr.digger_id = p_digger_id
  );
$$;

COMMENT ON FUNCTION public.exists_gigger_rating_for_reveal(uuid, uuid, uuid) IS
  'Used by ratings RLS to check mutual reveal without recursing into gigger_ratings RLS.';

-- 2) Helper: true if a rating exists for (gig_id, consumer_id, digger_id).
CREATE OR REPLACE FUNCTION public.exists_rating_for_reveal(
  p_gig_id uuid,
  p_consumer_id uuid,
  p_digger_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ratings r
    WHERE r.gig_id = p_gig_id
      AND r.consumer_id = p_consumer_id
      AND r.digger_id = p_digger_id
  );
$$;

COMMENT ON FUNCTION public.exists_rating_for_reveal(uuid, uuid, uuid) IS
  'Used by gigger_ratings RLS to check mutual reveal without recursing into ratings RLS.';

-- 3) Replace ratings SELECT policy to use the helper (no direct SELECT on gigger_ratings).
DROP POLICY IF EXISTS "Users can view own rating or after mutual review" ON public.ratings;
CREATE POLICY "Users can view own rating or after mutual review"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (
    consumer_id = auth.uid()
    OR public.exists_gigger_rating_for_reveal(gig_id, consumer_id, digger_id)
  );

-- 4) Replace gigger_ratings SELECT policy to use the helper (no direct SELECT on ratings).
DROP POLICY IF EXISTS "Users can view own gigger rating or after mutual review" ON public.gigger_ratings;
CREATE POLICY "Users can view own gigger rating or after mutual review"
  ON public.gigger_ratings FOR SELECT
  TO authenticated
  USING (
    digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
    OR public.exists_rating_for_reveal(gig_id, consumer_id, digger_id)
  );
