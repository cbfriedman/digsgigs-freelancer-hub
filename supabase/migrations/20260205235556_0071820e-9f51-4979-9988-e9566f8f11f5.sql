-- Fix Security Issues: Gigs PII Exposure and Gig Documents Storage Permissions
-- ============================================================================

-- ISSUE 1: Gigs table has public SELECT access exposing consumer_email and consumer_phone
-- Solution: Remove public SELECT and create restricted policies

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view gigs" ON public.gigs;

-- Create a helper function to check if user can access gig details
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
    -- Diggers who purchased the lead can access
    SELECT 1 FROM lead_purchases lp
    JOIN digger_profiles dp ON lp.digger_id = dp.id
    WHERE lp.gig_id = _gig_id AND dp.user_id = _user_id
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

-- Create a public view for gigs that excludes sensitive PII
-- This is used for public browsing/discovery without exposing contact info
CREATE OR REPLACE VIEW public.gigs_public AS
SELECT 
  id,
  title,
  description,
  status,
  category_id,
  timeline,
  budget_min,
  budget_max,
  location,
  location_lat,
  location_lng,
  is_confirmed_lead,
  lead_source,
  created_at,
  updated_at,
  naics_codes,
  sic_codes,
  purchase_count,
  preferred_regions
  -- Explicitly EXCLUDE: consumer_id, consumer_email, consumer_phone, client_name, telemarketer_id
FROM public.gigs
WHERE status IN ('open', 'in_progress', 'completed');

-- Grant public access to the view
GRANT SELECT ON public.gigs_public TO anon;
GRANT SELECT ON public.gigs_public TO authenticated;

-- Create restricted SELECT policy for gigs table
-- Only gig owner, lead purchasers, queue members, and admins can see full details
CREATE POLICY "Authorized users can view gig details" 
ON public.gigs 
FOR SELECT 
TO authenticated
USING (public.can_access_gig(auth.uid(), id));

-- ISSUE 2: Gig documents storage bucket is overly permissive
-- Solution: Restrict access to gig owners and lead purchasers only

-- First, create a helper function for storage access checks
CREATE OR REPLACE FUNCTION public.can_access_gig_documents(_user_id uuid, _file_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gig_id_text text;
  gig_uuid uuid;
BEGIN
  -- Extract gig ID from file path (first folder segment)
  gig_id_text := split_part(_file_path, '/', 1);
  
  -- Try to cast to UUID, return false if invalid
  BEGIN
    gig_uuid := gig_id_text::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  
  -- Check if user can access this gig
  RETURN public.can_access_gig(_user_id, gig_uuid);
END;
$$;

-- Drop the overly permissive storage policies
DROP POLICY IF EXISTS "Users can view their own gig documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own gig documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload gig documents" ON storage.objects;

-- Create restricted storage policies for gig-documents bucket
-- SELECT: Only gig owners and lead purchasers can view documents
CREATE POLICY "Gig stakeholders can view gig documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'gig-documents' 
  AND public.can_access_gig_documents(auth.uid(), name)
);

-- INSERT: Only gig owners can upload documents
CREATE POLICY "Gig owners can upload gig documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'gig-documents' 
  AND (
    -- Check that the first path segment (gig ID) is owned by this user
    split_part(name, '/', 1)::uuid IN (
      SELECT id FROM public.gigs WHERE consumer_id = auth.uid()
    )
  )
);

-- DELETE: Only gig owners can delete documents
CREATE POLICY "Gig owners can delete gig documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'gig-documents' 
  AND (
    split_part(name, '/', 1)::uuid IN (
      SELECT id FROM public.gigs WHERE consumer_id = auth.uid()
    )
  )
);