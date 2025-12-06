-- Fix Security Definer View issue by recreating safe_public_profiles with SECURITY INVOKER
-- Drop the existing view
DROP VIEW IF EXISTS public.safe_public_profiles;

-- Recreate the view with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.safe_public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_at,
  full_name,
  user_type
FROM public.profiles;