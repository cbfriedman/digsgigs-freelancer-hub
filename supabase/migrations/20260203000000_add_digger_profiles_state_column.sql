-- Ensure state (and city) exist on digger_profiles for Edit Digger Profile save
-- Fixes: PGRST204 "Could not find the 'state' column of 'digger_profiles' in the schema cache"
ALTER TABLE public.digger_profiles
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN public.digger_profiles.state IS 'Service area states/regions (comma-separated) or state/province for location.';
