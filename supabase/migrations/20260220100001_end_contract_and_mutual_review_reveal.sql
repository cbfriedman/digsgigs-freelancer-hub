-- End contract: Gigger can mark contract completed after all milestones paid.
-- Reviews allowed only after contract is ended (status = 'completed').
-- Mutual reveal: each party sees the other's review only after both have submitted.

-- 1) Allow escrow_contracts.status = 'completed' (already text, no constraint change needed).
--    Ensure is_contract_fully_completed requires status = 'completed' for escrow path so
--    "End contract" must be done before either party can leave a review.

CREATE OR REPLACE FUNCTION public.is_contract_fully_completed(p_gig_id uuid, p_digger_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gigs g
    WHERE g.id = p_gig_id
      AND g.awarded_digger_id = p_digger_id
      AND g.status = 'completed'
  )
  OR EXISTS (
    SELECT 1 FROM public.escrow_contracts ec
    WHERE ec.gig_id = p_gig_id
      AND ec.digger_id = p_digger_id
      AND ec.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM public.milestone_payments mp
        WHERE mp.escrow_contract_id = ec.id
          AND mp.status IS DISTINCT FROM 'paid'
      )
      AND EXISTS (
        SELECT 1 FROM public.milestone_payments mp
        WHERE mp.escrow_contract_id = ec.id
      )
  );
$$;

COMMENT ON FUNCTION public.is_contract_fully_completed(uuid, uuid) IS
  'True when the gig+digger engagement is complete: either gig completed with awarded digger, or escrow contract has status=completed and all milestones paid.';

-- 2) Mutual reveal: ratings (Gigger→Digger) visible to Digger only when Digger has also left a gigger_rating for this gig.
--    And gigger_ratings (Digger→Gigger) visible to Gigger only when Gigger has also left a rating for this gig.
--    Authors always see their own review.

-- Ratings: viewer can see row if (1) they are the consumer (author), or (2) there is a gigger_rating for same gig (mutual reveal)
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can view own rating or after mutual review" ON public.ratings;
CREATE POLICY "Users can view own rating or after mutual review"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (
    consumer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.gigger_ratings gr
      WHERE gr.gig_id = ratings.gig_id
        AND gr.consumer_id = ratings.consumer_id
        AND gr.digger_id = ratings.digger_id
    )
  );

-- Gigger_ratings: viewer can see if (1) they are the digger (author), or (2) there is a rating for same gig/consumer/digger (mutual reveal)
DROP POLICY IF EXISTS "Anyone can view gigger ratings" ON public.gigger_ratings;
DROP POLICY IF EXISTS "Users can view own gigger rating or after mutual review" ON public.gigger_ratings;
CREATE POLICY "Users can view own gigger rating or after mutual review"
  ON public.gigger_ratings FOR SELECT
  TO authenticated
  USING (
    digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ratings r
      WHERE r.gig_id = gigger_ratings.gig_id
        AND r.consumer_id = gigger_ratings.consumer_id
        AND r.digger_id = gigger_ratings.digger_id
    )
  );
