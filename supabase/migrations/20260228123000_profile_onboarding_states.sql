-- Sprint 1 onboarding persistence:
-- Shared identity step + role-path tracking for digger/gigger onboarding.

CREATE TABLE IF NOT EXISTS public.profile_onboarding_states (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_complete boolean NOT NULL DEFAULT false,
  digger_complete boolean NOT NULL DEFAULT false,
  gigger_complete boolean NOT NULL DEFAULT false,
  role_path text,
  last_step text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_onboarding_states_role_path_check
    CHECK (role_path IS NULL OR role_path IN ('digger_first', 'gigger_first', 'both'))
);

ALTER TABLE public.profile_onboarding_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding state" ON public.profile_onboarding_states;
CREATE POLICY "Users can view own onboarding state"
ON public.profile_onboarding_states
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding state" ON public.profile_onboarding_states;
CREATE POLICY "Users can insert own onboarding state"
ON public.profile_onboarding_states
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own onboarding state" ON public.profile_onboarding_states;
CREATE POLICY "Users can update own onboarding state"
ON public.profile_onboarding_states
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_profile_onboarding_states_updated_at ON public.profile_onboarding_states;
CREATE TRIGGER update_profile_onboarding_states_updated_at
BEFORE UPDATE ON public.profile_onboarding_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_my_profile_onboarding()
RETURNS TABLE (
  user_id uuid,
  shared_complete boolean,
  digger_complete boolean,
  gigger_complete boolean,
  role_path text,
  last_step text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.shared_complete,
    p.digger_complete,
    p.gigger_complete,
    p.role_path,
    p.last_step,
    p.updated_at
  FROM public.profile_onboarding_states p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.upsert_my_profile_onboarding(
  _shared_complete boolean DEFAULT NULL,
  _digger_complete boolean DEFAULT NULL,
  _gigger_complete boolean DEFAULT NULL,
  _role_path text DEFAULT NULL,
  _last_step text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  shared_complete boolean,
  digger_complete boolean,
  gigger_complete boolean,
  role_path text,
  last_step text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role_path IS NOT NULL AND _role_path NOT IN ('digger_first', 'gigger_first', 'both') THEN
    RAISE EXCEPTION 'Invalid role_path value: %', _role_path;
  END IF;

  INSERT INTO public.profile_onboarding_states (
    user_id,
    shared_complete,
    digger_complete,
    gigger_complete,
    role_path,
    last_step
  )
  VALUES (
    uid,
    COALESCE(_shared_complete, false),
    COALESCE(_digger_complete, false),
    COALESCE(_gigger_complete, false),
    _role_path,
    _last_step
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    shared_complete = COALESCE(_shared_complete, public.profile_onboarding_states.shared_complete),
    digger_complete = COALESCE(_digger_complete, public.profile_onboarding_states.digger_complete),
    gigger_complete = COALESCE(_gigger_complete, public.profile_onboarding_states.gigger_complete),
    role_path = COALESCE(_role_path, public.profile_onboarding_states.role_path),
    last_step = COALESCE(_last_step, public.profile_onboarding_states.last_step),
    updated_at = now();

  RETURN QUERY
  SELECT
    p.user_id,
    p.shared_complete,
    p.digger_complete,
    p.gigger_complete,
    p.role_path,
    p.last_step,
    p.updated_at
  FROM public.profile_onboarding_states p
  WHERE p.user_id = uid
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile_onboarding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_profile_onboarding(boolean, boolean, boolean, text, text) TO authenticated;
