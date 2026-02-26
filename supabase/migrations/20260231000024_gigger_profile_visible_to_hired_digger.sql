-- Within a hired gig, the awarded digger can see the gig owner's (gigger) full profile.
-- Allow SELECT on gigger_profiles when the requester is the awarded digger on at least one gig
-- where the gig's consumer_id = this gigger_profiles.user_id.

CREATE POLICY "Hired diggers can view their client gigger_profile"
  ON public.gigger_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.gigs g
      INNER JOIN public.digger_profiles dp ON dp.id = g.awarded_digger_id
      WHERE g.consumer_id = gigger_profiles.user_id
        AND dp.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Hired diggers can view their client gigger_profile" ON public.gigger_profiles IS
  'When a digger is awarded/hired on a gig, they can view that gig owner''s gigger profile (e.g. on /gigger/:userId) even if show_to_diggers is false.';
