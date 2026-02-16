-- User-level identity and verification (one per user, shared by Digger and Gigger roles).
-- Nationality, timezone, photo (avatar_url), and verification live here so one user
-- cannot have two nationalities/times/verification sets.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_verified boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS id_verified boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS social_verified boolean DEFAULT NULL;

COMMENT ON COLUMN public.profiles.country IS 'User nationality/country (e.g. United States). Same for Digger and Gigger.';
COMMENT ON COLUMN public.profiles.timezone IS 'IANA timezone (e.g. America/New_York) for local time. Same for Digger and Gigger.';
COMMENT ON COLUMN public.profiles.email_verified IS 'User has verified email. Shared across roles.';
COMMENT ON COLUMN public.profiles.phone_verified IS 'User has verified phone. Shared across roles.';
COMMENT ON COLUMN public.profiles.payment_verified IS 'User has payment method / has paid. Shared across roles.';
COMMENT ON COLUMN public.profiles.id_verified IS 'User has completed ID verification. Shared across roles.';
COMMENT ON COLUMN public.profiles.social_verified IS 'User has linked social (e.g. Google). Shared across roles.';
