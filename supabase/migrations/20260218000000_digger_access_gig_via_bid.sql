-- Allow diggers to view gig details for gigs they have bid on.
-- Fixes: My Bids page shows no bids because the bids query embeds gigs(...), and RLS on gigs
-- blocked diggers from reading gig rows unless they were owner, lead purchaser, or in queue.

CREATE OR REPLACE FUNCTION public.can_access_gig(_user_id uuid, _gig_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gigs WHERE id = _gig_id AND consumer_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM lead_purchases lp
    JOIN digger_profiles dp ON lp.digger_id = dp.id
    WHERE lp.gig_id = _gig_id AND dp.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM lead_exclusivity_queue leq
    JOIN digger_profiles dp ON leq.digger_id = dp.id
    WHERE leq.gig_id = _gig_id AND dp.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM bids b
    JOIN digger_profiles dp ON dp.id = b.digger_id
    WHERE b.gig_id = _gig_id AND dp.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM user_app_roles
    WHERE user_id = _user_id
      AND app_role = 'admin'
      AND is_active = true
  )
$$;

COMMENT ON FUNCTION public.can_access_gig(uuid, uuid) IS
  'Returns true if user can view full gig details: owner, lead purchaser, in exclusivity queue, has bid on gig, or admin.';
