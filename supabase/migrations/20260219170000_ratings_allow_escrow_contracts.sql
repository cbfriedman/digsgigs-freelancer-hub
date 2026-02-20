-- Allow Giggers to create ratings when they have an escrow contract with the Digger for this gig
-- (in addition to completed gigs with awarded_digger_id), so "Rate Professional" from
-- Transaction History works for escrow-paid gigs.

DROP POLICY IF EXISTS "Consumers can create ratings for completed gigs" ON public.ratings;

CREATE POLICY "Consumers can create ratings for completed gigs or escrow contracts"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    consumer_id = auth.uid()
    AND gig_id IS NOT NULL
    AND (
      -- Completed gig with awarded digger (bid flow)
      EXISTS (
        SELECT 1 FROM public.gigs g
        WHERE g.id = gig_id
          AND g.consumer_id = auth.uid()
          AND g.status = 'completed'
          AND g.awarded_digger_id = digger_id
      )
      OR
      -- Escrow flow: consumer owns gig and has an escrow contract with this digger for this gig
      EXISTS (
        SELECT 1 FROM public.escrow_contracts ec
        INNER JOIN public.gigs g ON g.id = ec.gig_id AND g.consumer_id = auth.uid()
        WHERE ec.gig_id = gig_id
          AND ec.digger_id = digger_id
      )
    )
  );
