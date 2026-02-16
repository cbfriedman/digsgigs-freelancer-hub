-- User-level cover photo (same for Digger and Gigger profile views).
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_photo_url text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.cover_photo_url IS 'Banner/cover image for profile. Shared by Digger and Gigger views (one per user).';
