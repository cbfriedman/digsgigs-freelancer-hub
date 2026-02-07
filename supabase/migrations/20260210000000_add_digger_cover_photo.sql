-- Add cover photo URL to digger_profiles for profile banner/header
-- Diggers can replace this on their edit profile page; giggers see it as read-only
ALTER TABLE public.digger_profiles
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

COMMENT ON COLUMN public.digger_profiles.cover_photo_url IS 'Banner/cover image displayed behind avatar on profile. Editable by digger only.';
