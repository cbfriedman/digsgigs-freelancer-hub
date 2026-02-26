-- Let any authenticated user see paid amounts per gig for a gigger (for "Reviews from freelancers").
-- Escrow RLS blocks direct SELECT for non-owners; this RPC returns only gig_id and total_amount.

CREATE OR REPLACE FUNCTION public.get_gigger_paid_amounts_by_gig(p_consumer_id uuid)
RETURNS TABLE (gig_id uuid, total_amount numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ec.gig_id, ec.total_amount
  FROM public.escrow_contracts ec
  WHERE ec.consumer_id = p_consumer_id
    AND ec.status = 'completed';
$$;

COMMENT ON FUNCTION public.get_gigger_paid_amounts_by_gig(uuid) IS
  'Returns gig_id and total_amount for completed escrow contracts of a gigger; used so diggers/visitors can see paid budget on review cards.';

GRANT EXECUTE ON FUNCTION public.get_gigger_paid_amounts_by_gig(uuid) TO authenticated;
