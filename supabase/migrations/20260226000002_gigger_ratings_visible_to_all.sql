-- Allow all authenticated users to view gigger_ratings (Reviews from freelancers).
-- So visitors viewing a gigger profile see the same reviews as the owner.

DROP POLICY IF EXISTS "Users can view own gigger rating or after mutual review" ON public.gigger_ratings;

CREATE POLICY "Anyone can view gigger ratings"
  ON public.gigger_ratings FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "Anyone can view gigger ratings" ON public.gigger_ratings IS
  'Reviews from freelancers are public; owner and visitors see the same list on gigger profile.';
