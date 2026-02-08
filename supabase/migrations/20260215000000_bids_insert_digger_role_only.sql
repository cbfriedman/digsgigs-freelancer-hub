-- Only diggers (users with app_role 'digger') can create bids.
-- Replace the existing INSERT policy to add has_app_role check.

DROP POLICY IF EXISTS "Diggers can create bids" ON public.bids;

CREATE POLICY "Only diggers can create bids"
  ON public.bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_app_role(auth.uid(), 'digger')
    AND digger_id IN (
      SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Only diggers can create bids" ON public.bids IS
  'Restricts bid creation to users with the digger role whose digger_id matches their profile.';
