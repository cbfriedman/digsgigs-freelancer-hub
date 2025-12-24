-- Add allow_gigger_contact column to digger_profiles
-- This allows Diggers to opt-in to receiving Profile Discovery contacts from Giggers

ALTER TABLE public.digger_profiles 
ADD COLUMN IF NOT EXISTS allow_gigger_contact BOOLEAN DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.digger_profiles.allow_gigger_contact IS 'When true, Giggers can pay to reveal this Digger contact info. Digger pays the Profile Discovery cost.';