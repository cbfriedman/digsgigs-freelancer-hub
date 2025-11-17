-- Add primary profession index to digger_profiles
ALTER TABLE public.digger_profiles 
ADD COLUMN primary_profession_index integer DEFAULT 0;

COMMENT ON COLUMN public.digger_profiles.primary_profession_index IS 'Index of the primary profession in the sic_code/naics_code arrays';