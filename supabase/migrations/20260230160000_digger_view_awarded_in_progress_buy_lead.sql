-- Allow diggers to view gigs with status awarded and in_progress so they can open the
-- gig detail page and buy a lead (Unlock lead / Contact the client now).
-- Previously only open and pending_confirmation were visible to public; now include
-- awarded and in_progress for the same list-and-detail visibility.

DROP POLICY IF EXISTS "Public can view open and pending gigs" ON public.gigs;

CREATE POLICY "Public can view open and pending gigs"
  ON public.gigs FOR SELECT
  TO public
  USING (
    status IN ('open', 'pending_confirmation', 'awarded', 'in_progress') OR
    consumer_id = auth.uid()
  );

COMMENT ON POLICY "Public can view open and pending gigs" ON public.gigs IS
  'Anyone can list and view gig details for open, pending, awarded, and in_progress so diggers can buy leads. Owner can always view own gigs. Contact PII is not in the default select for non-owners in the app.';
