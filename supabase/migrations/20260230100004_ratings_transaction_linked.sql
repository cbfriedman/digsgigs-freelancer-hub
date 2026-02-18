-- Transaction-linked reviews: one rating per (digger_id, gig_id)
-- Giggers can only leave a review for completed gigs they own with awarded_digger_id

-- 1. Replace UNIQUE(digger_id, consumer_id) with UNIQUE(digger_id, gig_id) for gig-linked reviews
ALTER TABLE public.ratings
  DROP CONSTRAINT IF EXISTS ratings_digger_id_consumer_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_digger_gig_unique
  ON public.ratings(digger_id, gig_id)
  WHERE gig_id IS NOT NULL;

-- 2. Restrict INSERT: consumers can only create ratings when gig_id is set and the gig
--    belongs to them, is completed, and has awarded_digger_id = digger_id
DROP POLICY IF EXISTS "Consumers can create ratings" ON public.ratings;

CREATE POLICY "Consumers can create ratings for completed gigs"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    consumer_id = auth.uid()
    AND gig_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.gigs g
      WHERE g.id = gig_id
        AND g.consumer_id = auth.uid()
        AND g.status = 'completed'
        AND g.awarded_digger_id = digger_id
    )
  );

-- 3. Diggers can only update digger_response and responded_at (not rating/review_text)
--    Use a trigger to reject changes to rating and review_text when updater is the digger
CREATE OR REPLACE FUNCTION public.ratings_digger_response_only()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.digger_profiles
    WHERE user_id = auth.uid() AND id = NEW.digger_id
  ) THEN
    -- Digger is updating: only digger_response and responded_at may change
    IF OLD.rating IS DISTINCT FROM NEW.rating OR OLD.review_text IS DISTINCT FROM NEW.review_text THEN
      RAISE EXCEPTION 'Diggers cannot edit or delete review content; they can only respond.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ratings_digger_response_only_trigger ON public.ratings;

CREATE TRIGGER ratings_digger_response_only_trigger
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.ratings_digger_response_only();
