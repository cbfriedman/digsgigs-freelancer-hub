-- Allow anonymous gig posting (Craigslist model)
-- Make consumer_id nullable to allow unauthenticated users to post gigs
ALTER TABLE public.gigs 
  ALTER COLUMN consumer_id DROP NOT NULL;

-- Update RLS policies to allow unauthenticated inserts for pending_confirmation gigs
-- Drop existing insert policy
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can insert their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can create gigs" ON public.gigs;

-- Allow anyone to insert gigs with pending_confirmation status (unauthenticated posting)
CREATE POLICY "Anyone can create pending gigs"
  ON public.gigs FOR INSERT
  TO public
  WITH CHECK (
    status = 'pending_confirmation' AND
    confirmation_status = 'pending' AND
    is_confirmed_lead = false AND
    (consumer_id IS NULL OR consumer_id = auth.uid())
  );

-- Allow authenticated users to insert their own gigs (for authenticated users)
CREATE POLICY "Authenticated users can create their own gigs"
  ON public.gigs FOR INSERT
  TO authenticated
  WITH CHECK (
    consumer_id = auth.uid() OR
    (status = 'pending_confirmation' AND consumer_id IS NULL)
  );

-- Allow gig owners to update their own gigs (by email for anonymous gigs)
-- We'll need to add a function to verify email ownership
CREATE OR REPLACE FUNCTION public.can_manage_gig(_gig_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gigs
    WHERE id = _gig_id
      AND (
        consumer_id = auth.uid() OR
        (consumer_id IS NULL AND consumer_email = _email)
      )
  )
$$;

-- Update the update policy to allow email-based access for anonymous gigs
-- Note: Email-based verification will be handled via edge functions with service role
-- For now, only allow authenticated users to update their own gigs
DROP POLICY IF EXISTS "Enable update for gig owners" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can update own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can update their own gigs" ON public.gigs;

CREATE POLICY "Gig owners can update their gigs"
  ON public.gigs FOR UPDATE
  TO authenticated
  USING (consumer_id = auth.uid())
  WITH CHECK (consumer_id = auth.uid());

-- Anonymous gig updates will be handled via edge functions with service role
-- after email verification

-- Allow viewing of open gigs by everyone (including unauthenticated)
DROP POLICY IF EXISTS "Public can view gigs without contact info" ON public.gigs;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can view their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Diggers can view all gigs" ON public.gigs;
DROP POLICY IF EXISTS "Anyone can view open gigs" ON public.gigs;

CREATE POLICY "Public can view open and pending gigs"
  ON public.gigs FOR SELECT
  TO public
  USING (
    status IN ('open', 'pending_confirmation') OR
    consumer_id = auth.uid()
  );

-- Add comment explaining the change
COMMENT ON COLUMN public.gigs.consumer_id IS 'Nullable to allow anonymous gig posting. Set when user confirms via email.';
