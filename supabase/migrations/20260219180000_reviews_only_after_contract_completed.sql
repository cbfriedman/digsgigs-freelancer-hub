-- Reviews & ratings only after contract is fully completed (all milestones paid or gig completed).
-- One review per gig (Gigger→Digger in ratings; Digger→Gigger in gigger_ratings).
-- Helper: contract is "fully completed" when (a) gig completed + awarded_digger_id, or
-- (b) escrow contract exists for (gig_id, digger_id) and ALL its milestones have status = 'paid'.

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
  'True when the gig+digger engagement is complete: either gig completed with awarded digger, or escrow contract has all milestones paid.';

-- RPC for frontend to check if rating is allowed (contract fully completed)
CREATE OR REPLACE FUNCTION public.is_contract_fully_completed_rpc(p_gig_id uuid, p_digger_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_contract_fully_completed(p_gig_id, p_digger_id);
$$;

-- Restrict Gigger→Digger ratings: only when contract fully completed
DROP POLICY IF EXISTS "Consumers can create ratings for completed gigs or escrow contracts" ON public.ratings;

CREATE POLICY "Consumers can create ratings when contract fully completed"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    consumer_id = auth.uid()
    AND gig_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.gigs g
      WHERE g.id = gig_id AND g.consumer_id = auth.uid()
    )
    AND public.is_contract_fully_completed(gig_id, digger_id)
  );
