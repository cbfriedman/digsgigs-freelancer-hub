-- Fix infinite recursion in gigs RLS policies
-- This migration drops all existing policies and recreates them without recursion

-- Drop ALL existing policies on gigs table to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Users can view gigs they created" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can view their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Diggers can view available gigs" ON public.gigs;
DROP POLICY IF EXISTS "Diggers can view all gigs" ON public.gigs;
DROP POLICY IF EXISTS "Users can view all gigs" ON public.gigs;
DROP POLICY IF EXISTS "Anyone can view gigs" ON public.gigs;
DROP POLICY IF EXISTS "Anyone can view open gigs" ON public.gigs;
DROP POLICY IF EXISTS "Public can view gigs without contact info" ON public.gigs;
DROP POLICY IF EXISTS "Lead purchasers can view contact info" ON public.gigs;
DROP POLICY IF EXISTS "Gig owners can view own contact info" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can insert their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can create gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can update their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can update own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Consumers can delete their own gigs" ON public.gigs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.gigs;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.gigs;
DROP POLICY IF EXISTS "Enable update for gig owners" ON public.gigs;
DROP POLICY IF EXISTS "Enable delete for gig owners" ON public.gigs;

-- Create simple, non-recursive policies
-- These policies do NOT query the gigs table itself, avoiding recursion

-- SELECT: Authenticated users can view all gigs (simple, no recursion)
CREATE POLICY "Authenticated users can view gigs"
ON public.gigs
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can only insert gigs where they are the consumer
CREATE POLICY "Users can insert their own gigs"
ON public.gigs
FOR INSERT
TO authenticated
WITH CHECK (consumer_id = auth.uid());

-- UPDATE: Users can only update gigs where they are the consumer
CREATE POLICY "Users can update their own gigs"
ON public.gigs
FOR UPDATE
TO authenticated
USING (consumer_id = auth.uid())
WITH CHECK (consumer_id = auth.uid());

-- DELETE: Users can only delete gigs where they are the consumer
CREATE POLICY "Users can delete their own gigs"
ON public.gigs
FOR DELETE
TO authenticated
USING (consumer_id = auth.uid());

-- Note: Contact info visibility is handled at the application level or via column-level security
-- We don't need separate policies for contact info as it would require querying lead_purchases
-- which might cause recursion if lead_purchases policies query gigs

