-- Optional profile title/subtitle (e.g. "Client / Project owner" or custom) for Gigger and shared profile views.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_title text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.profile_title IS 'Optional title/subtitle under display name (e.g. "Client / Project owner"). Used on Gigger profile.';
