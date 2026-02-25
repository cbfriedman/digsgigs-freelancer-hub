-- Hourly project feature: gigs can be fixed (budget range) or hourly (rate range + optional estimated hours).
-- Bids on hourly gigs store hourly_rate and estimated_hours; amount = rate * hours for display/eligibility.

-- Gigs: project type and optional hourly fields
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'fixed'
  CHECK (project_type IN ('fixed', 'hourly'));

ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS hourly_rate_min numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hourly_rate_max numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours_min numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours_max numeric DEFAULT NULL;

COMMENT ON COLUMN public.gigs.project_type IS 'fixed = one budget for the project; hourly = pay by the hour with optional rate/hours range.';
COMMENT ON COLUMN public.gigs.hourly_rate_min IS 'For hourly projects: client acceptable hourly rate minimum ($/hr).';
COMMENT ON COLUMN public.gigs.hourly_rate_max IS 'For hourly projects: client acceptable hourly rate maximum ($/hr).';
COMMENT ON COLUMN public.gigs.estimated_hours_min IS 'For hourly projects: optional estimated hours minimum.';
COMMENT ON COLUMN public.gigs.estimated_hours_max IS 'For hourly projects: optional estimated hours maximum.';

-- Bids: for hourly gigs, digger proposes rate and optional hours; amount = rate * hours (or rate only)
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT NULL;

COMMENT ON COLUMN public.bids.hourly_rate IS 'For hourly gigs: digger proposed $/hr. amount can be rate * estimated_hours for display.';
COMMENT ON COLUMN public.bids.estimated_hours IS 'For hourly gigs: digger estimated hours. amount = hourly_rate * estimated_hours when both set.';
