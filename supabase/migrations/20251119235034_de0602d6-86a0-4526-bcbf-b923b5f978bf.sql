-- Make profession nullable and add registration status tracking
ALTER TABLE public.digger_profiles 
ALTER COLUMN profession DROP NOT NULL;

-- Add registration status field
ALTER TABLE public.digger_profiles 
ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'incomplete' CHECK (registration_status IN ('incomplete', 'complete', 'pending'));

-- Add index for querying incomplete registrations
CREATE INDEX IF NOT EXISTS idx_digger_profiles_registration_status 
ON public.digger_profiles(registration_status, created_at);