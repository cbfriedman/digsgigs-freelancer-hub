-- Add fields for Profile Details: website, service countries, monthly salary
ALTER TABLE public.digger_profiles
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS service_countries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monthly_salary numeric;

COMMENT ON COLUMN public.digger_profiles.website_url IS 'Digger business/company website URL';
COMMENT ON COLUMN public.digger_profiles.service_countries IS 'Country names where digger offers services (full names, e.g. United States)';
COMMENT ON COLUMN public.digger_profiles.monthly_salary IS 'Expected monthly salary in local currency';
