-- Drop all existing gigs policies to clean up duplicates
DROP POLICY IF EXISTS "Consumers can create gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can delete their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can insert their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can update own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can update their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can view their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Diggers can view all gigs" ON public.gigs;
DROP POLICY IF EXISTS "Enable delete for gig owners" ON public.gigs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.gigs;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.gigs;
DROP POLICY IF EXISTS "Enable update for gig owners" ON public.gigs;
DROP POLICY IF EXISTS "Gig owners can view own contact info" ON public.gigs;
DROP POLICY IF EXISTS "Lead purchasers can view contact info" ON public.gigs;
DROP POLICY IF EXISTS "Public can view gigs without contact info" ON public.gigs;

-- Create clean, non-recursive RLS policies for gigs
-- INSERT: Only consumers can create gigs for themselves
CREATE POLICY "Consumers can insert gigs" ON public.gigs
FOR INSERT 
TO authenticated
WITH CHECK (consumer_id = auth.uid());

-- SELECT: Authenticated users can view all gigs (diggers need to browse)
CREATE POLICY "Authenticated users can view gigs" ON public.gigs
FOR SELECT 
TO authenticated
USING (true);

-- UPDATE: Only gig owners can update their gigs
CREATE POLICY "Gig owners can update gigs" ON public.gigs
FOR UPDATE 
TO authenticated
USING (consumer_id = auth.uid())
WITH CHECK (consumer_id = auth.uid());

-- DELETE: Only gig owners can delete their gigs
CREATE POLICY "Gig owners can delete gigs" ON public.gigs
FOR DELETE 
TO authenticated
USING (consumer_id = auth.uid());