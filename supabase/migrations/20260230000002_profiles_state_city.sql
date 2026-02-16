-- Add optional state/city fields for shared user location.
-- Used by Gigger profile edit modal and display.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN public.profiles.state IS 'Optional state/region for profile location.';
COMMENT ON COLUMN public.profiles.city IS 'Optional city for profile location.';
