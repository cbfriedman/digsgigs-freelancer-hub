-- Drop existing public viewing policy on digger_profiles if it exists
DROP POLICY IF EXISTS "Public can view digger profiles" ON public.digger_profiles;
DROP POLICY IF EXISTS "Anyone can view digger profiles" ON public.digger_profiles;
DROP POLICY IF EXISTS "Digger profiles are viewable by everyone" ON public.digger_profiles;

-- Create security definer function to check if gigger has access to this digger
CREATE OR REPLACE FUNCTION public.gigger_has_access_to_digger(_gigger_user_id uuid, _digger_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if gigger has any gig that was matched/sent to this digger
  SELECT EXISTS (
    SELECT 1
    FROM public.gigs g
    WHERE g.consumer_id = _gigger_user_id
      AND (
        -- Check lead_purchases for this digger and gig
        EXISTS (
          SELECT 1 FROM public.lead_purchases lp
          WHERE lp.gig_id = g.id 
            AND lp.digger_id = _digger_profile_id
        )
        -- Check lead_exclusivity_queue for this digger and gig
        OR EXISTS (
          SELECT 1 FROM public.lead_exclusivity_queue leq
          WHERE leq.gig_id = g.id 
            AND leq.digger_id = _digger_profile_id
        )
      )
  )
$$;

-- Policy: Diggers can view their own profiles
CREATE POLICY "Diggers can view own profiles"
ON public.digger_profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy: Giggers can view profiles only if their gig was sent to that digger
CREATE POLICY "Giggers can view matched digger profiles"
ON public.digger_profiles
FOR SELECT
TO authenticated
USING (
  public.gigger_has_access_to_digger(auth.uid(), id)
);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all digger profiles"
ON public.digger_profiles
FOR SELECT
TO authenticated
USING (
  public.has_app_role(auth.uid(), 'admin')
);