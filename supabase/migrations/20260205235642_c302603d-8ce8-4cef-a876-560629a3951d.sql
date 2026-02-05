-- Fix: Update gigs_public view to use security_invoker to avoid security warning
DROP VIEW IF EXISTS public.gigs_public;

CREATE VIEW public.gigs_public 
WITH (security_invoker = on) AS
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
FROM public.gigs
WHERE status IN ('open', 'in_progress', 'completed');

-- Re-grant permissions
GRANT SELECT ON public.gigs_public TO anon;
GRANT SELECT ON public.gigs_public TO authenticated;