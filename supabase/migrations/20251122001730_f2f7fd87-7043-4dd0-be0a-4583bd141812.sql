-- Remove custom verification system
DROP TABLE IF EXISTS public.verification_codes CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_verification_codes() CASCADE;