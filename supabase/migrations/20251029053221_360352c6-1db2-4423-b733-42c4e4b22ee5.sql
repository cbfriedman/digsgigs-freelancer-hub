-- Add handle and trust signal columns to digger_profiles
ALTER TABLE public.digger_profiles
ADD COLUMN handle text UNIQUE,
ADD COLUMN work_photos text[] DEFAULT '{}',
ADD COLUMN response_time_hours integer,
ADD COLUMN completion_rate numeric CHECK (completion_rate >= 0 AND completion_rate <= 100),
ADD COLUMN is_insured boolean DEFAULT false,
ADD COLUMN is_bonded boolean DEFAULT false;

-- Add comment explaining the handle
COMMENT ON COLUMN public.digger_profiles.handle IS 'Public display name chosen by digger, not their real name';

-- Create index on handle for fast lookups
CREATE INDEX idx_digger_profiles_handle ON public.digger_profiles(handle);