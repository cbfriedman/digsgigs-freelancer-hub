-- Refine digger publish criteria:
-- essentials only for go-live (category/profession, location, pricing + shared handle)

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

  RETURN QUERY
  SELECT
    dp.id,
    coalesce(array_length(missing, 1), 0) = 0,
    missing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_publish_digger(uuid) TO authenticated;
