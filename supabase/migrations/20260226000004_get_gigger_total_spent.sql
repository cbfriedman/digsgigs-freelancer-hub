-- Let any authenticated user see a gigger's total spent (for profile "Spent" stat).
-- Escrow RLS blocks direct SELECT for non-owners; this RPC returns the sum.
-- We only sum escrow for gigs that have a gigger_rating (review) so "Spent" matches
-- the sum of "Paid" amounts shown on review cards.

CREATE OR REPLACE FUNCTION public.get_gigger_total_spent(p_consumer_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(ec.total_amount), 0)::numeric
  FROM public.escrow_contracts ec
  WHERE ec.consumer_id = p_consumer_id
    AND ec.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.gigger_ratings gr
      WHERE gr.gig_id = ec.gig_id
        AND gr.consumer_id = ec.consumer_id
    );
$$;

COMMENT ON FUNCTION public.get_gigger_total_spent(uuid) IS
  'Returns total paid on completed escrow for gigs that have a review; matches sum of Paid on review cards.';

GRANT EXECUTE ON FUNCTION public.get_gigger_total_spent(uuid) TO authenticated;
