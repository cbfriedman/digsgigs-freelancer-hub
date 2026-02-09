-- Allow giggers to view digger_profiles for diggers who have bid on their gigs.
-- This fixes: gigger sees "2 proposals" on My Gigs but cannot see proposal cards on the gig page,
-- because RLS only allowed viewing diggers from lead_purchases/lead_exclusivity_queue, not bidders.

CREATE OR REPLACE FUNCTION public.gigger_has_access_to_digger(_gigger_user_id uuid, _digger_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Gigger can view this digger if:
  -- 1. Their gig was matched/sent to this digger (lead_purchases or lead_exclusivity_queue), OR
  -- 2. This digger has placed a bid on any of the gigger's gigs
  SELECT EXISTS (
    SELECT 1
    FROM public.gigs g
    WHERE g.consumer_id = _gigger_user_id
      AND (
        EXISTS (
          SELECT 1 FROM public.lead_purchases lp
          WHERE lp.gig_id = g.id AND lp.digger_id = _digger_profile_id
        )
        OR EXISTS (
          SELECT 1 FROM public.lead_exclusivity_queue leq
          WHERE leq.gig_id = g.id AND leq.digger_id = _digger_profile_id
        )
        OR EXISTS (
          SELECT 1 FROM public.bids b
          WHERE b.gig_id = g.id AND b.digger_id = _digger_profile_id
        )
      )
  )
$$;

COMMENT ON FUNCTION public.gigger_has_access_to_digger(uuid, uuid) IS
  'Returns true if the gigger can view this digger profile: gig was sent to digger (lead_purchases/lead_exclusivity_queue) or digger has bid on gigger''s gig.';
