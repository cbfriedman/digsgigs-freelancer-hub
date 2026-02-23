-- Giggers need to see which of their gigs already have a platform reference
-- so "Leave reference" can be shown as deactivated (Reference left) on My Gigs.
CREATE POLICY "Giggers can view references for their own gigs"
  ON public.references FOR SELECT
  TO authenticated
  USING (
    gig_id IS NOT NULL
    AND gig_id IN (
      SELECT id FROM public.gigs WHERE consumer_id = auth.uid()
    )
  );

COMMENT ON POLICY "Giggers can view references for their own gigs" ON public.references IS
  'Allows gig owner to see platform references on their gigs so UI can show Reference left.';
