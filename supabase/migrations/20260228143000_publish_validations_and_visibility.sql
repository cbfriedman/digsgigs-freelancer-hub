-- Sprint 3: publish criteria RPCs + visibility flags

ALTER TABLE public.digger_profiles
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gigger_public boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_publish_digger(_digger_id uuid DEFAULT NULL)
RETURNS TABLE (
  digger_id uuid,
  can_publish boolean,
  missing_fields text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  dp public.digger_profiles%ROWTYPE;
  missing text[] := ARRAY[]::text[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO p
  FROM public.profiles
  WHERE id = uid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, ARRAY['profile_missing']::text[];
    RETURN;
  END IF;

  IF _digger_id IS NOT NULL THEN
    SELECT *
    INTO dp
    FROM public.digger_profiles
    WHERE id = _digger_id
      AND user_id = uid
    LIMIT 1;
  ELSE
    SELECT *
    INTO dp
    FROM public.digger_profiles
    WHERE user_id = uid
    ORDER BY is_primary DESC NULLS LAST, created_at ASC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, ARRAY['digger_profile_missing']::text[];
    RETURN;
  END IF;

  IF p.handle IS NULL OR btrim(p.handle) = '' THEN
    missing := array_append(missing, 'shared_handle');
  END IF;

  IF (dp.profession IS NULL OR btrim(coalesce(dp.profession, '')) = '')
     AND coalesce(array_length(dp.sic_code, 1), 0) = 0
     AND coalesce(array_length(dp.naics_code, 1), 0) = 0 THEN
    missing := array_append(missing, 'category_or_profession');
  END IF;

  IF dp.location IS NULL OR btrim(coalesce(dp.location, '')) = '' THEN
    missing := array_append(missing, 'location');
  END IF;

  IF dp.hourly_rate IS NULL
     AND dp.hourly_rate_min IS NULL
     AND dp.hourly_rate_max IS NULL THEN
    missing := array_append(missing, 'pricing');
  END IF;

  IF (dp.portfolio_url IS NULL OR btrim(coalesce(dp.portfolio_url, '')) = '')
     AND coalesce(array_length(dp.work_photos, 1), 0) = 0 THEN
    missing := array_append(missing, 'portfolio_or_work_samples');
  END IF;

  IF dp.availability IS NULL OR btrim(coalesce(dp.availability, '')) = '' THEN
    missing := array_append(missing, 'availability');
  END IF;

  RETURN QUERY
  SELECT
    dp.id,
    coalesce(array_length(missing, 1), 0) = 0,
    missing;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_publish_gigger()
RETURNS TABLE (
  user_id uuid,
  can_publish boolean,
  missing_fields text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  missing text[] := ARRAY[]::text[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO p
  FROM public.profiles
  WHERE id = uid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, ARRAY['profile_missing']::text[];
    RETURN;
  END IF;

  IF p.handle IS NULL OR btrim(p.handle) = '' THEN
    missing := array_append(missing, 'shared_handle');
  END IF;

  IF p.about_me IS NULL OR btrim(coalesce(p.about_me, '')) = '' THEN
    missing := array_append(missing, 'about_me');
  END IF;

  IF coalesce(array_length(p.gigger_project_categories, 1), 0) = 0
     AND (p.gigger_preferred_location IS NULL OR btrim(coalesce(p.gigger_preferred_location, '')) = '') THEN
    missing := array_append(missing, 'project_categories_or_preferred_location');
  END IF;

  RETURN QUERY
  SELECT
    uid,
    coalesce(array_length(missing, 1), 0) = 0,
    missing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_publish_digger(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_publish_gigger() TO authenticated;
