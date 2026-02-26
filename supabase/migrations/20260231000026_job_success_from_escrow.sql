-- Job success (completion_rate) derived from escrow_contracts.
-- completed = contracts with status = 'completed'
-- ended = contracts with status IN ('completed', 'cancelled', 'refunded') [future-proof]
-- completion_rate = 100 * completed / ended, or NULL if no ended contracts.

-- Compute completion rate for a digger (0–100 or null)
CREATE OR REPLACE FUNCTION public.compute_digger_completion_rate(p_digger_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT
      count(*) FILTER (WHERE status = 'completed') AS completed,
      count(*) FILTER (WHERE status IN ('completed', 'cancelled', 'refunded')) AS ended
    FROM public.escrow_contracts
    WHERE digger_id = p_digger_id
  )
  SELECT CASE
    WHEN (SELECT ended FROM counts) = 0 THEN NULL
    ELSE round(100.0 * (SELECT completed FROM counts) / NULLIF((SELECT ended FROM counts), 0), 2)
  END;
$$;

COMMENT ON FUNCTION public.compute_digger_completion_rate(uuid) IS
  'Returns job success % (0–100) from escrow: 100 * completed / ended. Ended = completed + cancelled + refunded. NULL if no ended contracts.';

-- Trigger function: after escrow_contracts change, update that digger's completion_rate
CREATE OR REPLACE FUNCTION public.sync_digger_completion_rate_on_escrow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    d_id := OLD.digger_id;
  ELSE
    d_id := NEW.digger_id;
  END IF;
  UPDATE public.digger_profiles
  SET completion_rate = public.compute_digger_completion_rate(d_id)
  WHERE id = d_id;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_digger_completion_rate_trigger ON public.escrow_contracts;
CREATE TRIGGER sync_digger_completion_rate_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON public.escrow_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_digger_completion_rate_on_escrow();

-- Backfill: set completion_rate for all diggers who have at least one escrow contract
-- (so rate is computed or NULL consistently)
UPDATE public.digger_profiles dp
SET completion_rate = public.compute_digger_completion_rate(dp.id)
WHERE EXISTS (
  SELECT 1 FROM public.escrow_contracts ec
  WHERE ec.digger_id = dp.id
);
