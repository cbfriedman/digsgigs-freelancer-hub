-- Limit each user to at most 3 digger profiles.
-- This enforces the rule at DB level in addition to UI checks.

CREATE OR REPLACE FUNCTION public.enforce_digger_profile_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_count integer;
BEGIN
  SELECT COUNT(*) INTO profile_count
  FROM public.digger_profiles
  WHERE user_id = NEW.user_id;

  IF profile_count >= 3 THEN
    RAISE EXCEPTION 'You can create up to 3 Digger profiles.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_digger_profile_limit ON public.digger_profiles;
CREATE TRIGGER trigger_enforce_digger_profile_limit
  BEFORE INSERT ON public.digger_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_digger_profile_limit();
