-- Add lead limit preferences to digger_profiles
ALTER TABLE public.digger_profiles
ADD COLUMN lead_limit_period text DEFAULT 'monthly' CHECK (lead_limit_period IN ('daily', 'weekly', 'monthly')),
ADD COLUMN lead_limit integer DEFAULT NULL,
ADD COLUMN lead_limit_enabled boolean DEFAULT false;

COMMENT ON COLUMN public.digger_profiles.lead_limit_period IS 'Period for lead limit: daily, weekly, or monthly';
COMMENT ON COLUMN public.digger_profiles.lead_limit IS 'Maximum number of leads to receive in the period';
COMMENT ON COLUMN public.digger_profiles.lead_limit_enabled IS 'Whether lead limiting is active';