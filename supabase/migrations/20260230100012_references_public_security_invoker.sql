-- Fix: View public.references_public was defined with default SECURITY DEFINER.
-- Set security_invoker = true so the view uses the querying user's permissions
-- and RLS on references is respected.

ALTER VIEW public.references_public SET (security_invoker = true);
