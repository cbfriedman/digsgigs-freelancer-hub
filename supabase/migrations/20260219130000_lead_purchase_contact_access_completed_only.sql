-- Restrict gig contact access to Diggers with completed lead purchases only.
-- can_access_gig currently allows any lead_purchases row; require status = 'completed'
-- so contact info (client_name, consumer_email, consumer_phone) is only visible after payment clears.

CREATE OR REPLACE FUNCTION public.can_access_gig(_user_id uuid, _gig_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Gig owner can access
    SELECT 1 FROM gigs WHERE id = _gig_id AND consumer_id = _user_id
  )
  OR EXISTS (
    -- Diggers who completed lead purchase can access (see contact info, message client)
    SELECT 1 FROM lead_purchases lp
    JOIN digger_profiles dp ON lp.digger_id = dp.id
    WHERE lp.gig_id = _gig_id AND dp.user_id = _user_id AND lp.status = 'completed'
  )
  OR EXISTS (
    -- Diggers in exclusivity queue can access
    SELECT 1 FROM lead_exclusivity_queue leq
    JOIN digger_profiles dp ON leq.digger_id = dp.id
    WHERE leq.gig_id = _gig_id AND dp.user_id = _user_id
  )
  OR EXISTS (
    -- Admins can access
    SELECT 1 FROM user_app_roles
    WHERE user_id = _user_id
      AND app_role = 'admin'
      AND is_active = true
  )
$$;

COMMENT ON FUNCTION public.can_access_gig(uuid, uuid) IS
  'True if user may view full gig details (including contact). Owner, completed lead purchasers, queue members, admins.';
