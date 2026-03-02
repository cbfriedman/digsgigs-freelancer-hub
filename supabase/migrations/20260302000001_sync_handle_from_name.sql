-- When first_name / last_name change (e.g. after admin approves identity request),
-- update full_name and recompute handle so profile URL matches the new name.
-- Handle format matches app: firstname_lastname (lowercase, underscores, max 32 chars).

CREATE OR REPLACE FUNCTION public.slugify_handle_from_name(first_name text, last_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
BEGIN
  v := lower(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')));
  v := regexp_replace(v, '\s+', '_', 'g');
  v := regexp_replace(v, '[^a-z0-9_]', '', 'g');
  v := trim(both '_' from v);
  IF length(v) < 3 THEN
    RETURN 'user';
  END IF;
  RETURN left(v, 32);
END;
$$;

-- Returns a handle unique among all profiles and digger_profiles, excluding handles for p_user_id.
CREATE OR REPLACE FUNCTION public.ensure_handle_unique(
  base_handle text,
  p_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  used text[];
  candidate text;
  n int;
BEGIN
  base_handle := lower(regexp_replace(coalesce(base_handle, 'user'), '[^a-z0-9_]', '', 'g'));
  base_handle := left(nullif(trim(base_handle), ''), 32);
  IF base_handle IS NULL OR base_handle = '' THEN
    base_handle := 'user';
  END IF;

  SELECT array_agg(h) INTO used
  FROM (
    SELECT lower(handle) AS h FROM public.profiles WHERE handle IS NOT NULL AND trim(handle) != '' AND id != p_user_id
    UNION
    SELECT lower(handle) FROM public.digger_profiles WHERE handle IS NOT NULL AND trim(handle) != '' AND user_id != p_user_id
  ) t;

  used := coalesce(used, array[]::text[]);
  candidate := base_handle;
  IF NOT (candidate = ANY(used)) THEN
    RETURN candidate;
  END IF;
  n := 2;
  LOOP
    candidate := base_handle || '_' || n;
    IF NOT (candidate = ANY(used)) THEN
      RETURN candidate;
    END IF;
    n := n + 1;
    IF n > 999 THEN
      RETURN base_handle || '_' || extract(epoch from now())::bigint::text;
    END IF;
  END LOOP;
END;
$$;

-- Sync full_name and handle from first_name/last_name for a user. Updates profiles and all digger_profiles for that user.
CREATE OR REPLACE FUNCTION public.sync_profile_handle_from_name(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  new_full_name text;
  base_handle text;
  main_handle text;
  used text[];
  next_handle text;
  n int;
BEGIN
  SELECT first_name, last_name INTO r
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  new_full_name := trim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, ''));
  IF new_full_name = '' THEN
    RETURN;
  END IF;

  base_handle := public.slugify_handle_from_name(r.first_name, r.last_name);
  main_handle := public.ensure_handle_unique(base_handle, p_user_id);

  UPDATE public.profiles
  SET full_name = new_full_name, handle = main_handle
  WHERE id = p_user_id;

  -- Build used set: other users' handles plus main_handle (so 2nd/3rd profiles get base_2, base_3)
  SELECT array_agg(h) INTO used
  FROM (
    SELECT lower(handle) AS h FROM public.profiles WHERE handle IS NOT NULL AND trim(handle) != '' AND id != p_user_id
    UNION
    SELECT lower(handle) FROM public.digger_profiles WHERE handle IS NOT NULL AND trim(handle) != '' AND user_id != p_user_id
  ) t;
  used := coalesce(used, array[]::text[]) || main_handle;

  FOR r IN
    SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
    FROM public.digger_profiles
    WHERE user_id = p_user_id
  LOOP
    IF r.rn = 1 THEN
      UPDATE public.digger_profiles SET handle = main_handle WHERE id = r.id;
    ELSE
      n := 2;
      next_handle := base_handle || '_' || n;
      WHILE next_handle = ANY(used) LOOP
        n := n + 1;
        next_handle := base_handle || '_' || n;
        IF n > 999 THEN
          next_handle := base_handle || '_' || extract(epoch from now())::bigint::text;
          EXIT;
        END IF;
      END LOOP;
      used := used || next_handle;
      UPDATE public.digger_profiles SET handle = next_handle WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.sync_profile_handle_from_name(uuid) IS
  'Updates full_name and handle from first_name/last_name so profile URL matches name. Call after applying identity updates (e.g. on approve of profile_identity_update_requests).';
