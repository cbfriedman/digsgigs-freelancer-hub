-- Allow Gigger (consumer) to see all gigger_ratings about themselves (reviews from freelancers).
-- Previously only the digger (author) or mutual-reveal could see; the consumer could not see their own reviews.

DROP POLICY IF EXISTS "Users can view own gigger rating or after mutual review" ON public.gigger_ratings;

CREATE POLICY "Users can view own gigger rating or after mutual review"
  ON public.gigger_ratings FOR SELECT
  TO authenticated
  USING (
    consumer_id = auth.uid()
    OR digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
    OR public.exists_rating_for_reveal(gig_id, consumer_id, digger_id)
  );

COMMENT ON POLICY "Users can view own gigger rating or after mutual review" ON public.gigger_ratings IS
  'Consumer (gigger) sees all reviews about them; digger sees own review; others see only after mutual reveal.';
