-- Fix infinite recursion in gigs RLS policies by using security definer functions

-- Drop existing problematic policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Users can view gigs they created" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can view their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Diggers can view available gigs" ON public.gigs;
DROP POLICY IF EXISTS "Users can view all gigs" ON public.gigs;
DROP POLICY IF EXISTS "Anyone can view gigs" ON public.gigs;

-- Create security definer function to check if user is gig owner
CREATE OR REPLACE FUNCTION public.is_gig_owner(_user_id uuid, _gig_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gigs
    WHERE id = _gig_id
      AND consumer_id = _user_id
  )
$$;

-- Create security definer function to check if user has digger role
CREATE OR REPLACE FUNCTION public.is_digger(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_app_roles
    WHERE user_id = _user_id
      AND app_role = 'digger'
      AND is_active = true
  )
$$;

-- Recreate policies using security definer functions (no recursion)
CREATE POLICY "Consumers can view their own gigs"
ON public.gigs
FOR SELECT
USING (consumer_id = auth.uid());

CREATE POLICY "Diggers can view all gigs"
ON public.gigs
FOR SELECT
USING (public.is_digger(auth.uid()));

CREATE POLICY "Consumers can insert their own gigs"
ON public.gigs
FOR INSERT
WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Consumers can update their own gigs"
ON public.gigs
FOR UPDATE
USING (consumer_id = auth.uid());

CREATE POLICY "Consumers can delete their own gigs"
ON public.gigs
FOR DELETE
USING (consumer_id = auth.uid());