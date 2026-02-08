-- Allow posting gigs that go live immediately (status = open, no email confirmation).
-- PostGig.tsx inserts with status = 'open', confirmation_status = 'confirmed', is_confirmed_lead = true.
-- Existing policies only allowed status = 'pending_confirmation', so inserts were rejected by RLS.

CREATE POLICY "Anyone can create open gigs"
  ON public.gigs FOR INSERT
  TO public
  WITH CHECK (
    status = 'open'
    AND (consumer_id IS NULL OR consumer_id = auth.uid())
  );
