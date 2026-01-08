-- Fix RLS policy for campaign_conversions to allow admins to view all records
-- The issue: Data is being inserted but RLS is blocking admin from viewing it

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can view all conversions" ON public.campaign_conversions;

-- Create a more permissive admin policy
-- This policy allows admins to view ALL records, including anonymous tracking events
CREATE POLICY "Admins can view all conversions"
ON public.campaign_conversions
FOR SELECT
USING (
  -- Check if user has admin role using the has_role function
  public.has_role(auth.uid(), 'admin'::app_role)
);
