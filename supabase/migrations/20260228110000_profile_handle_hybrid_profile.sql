-- Hybrid profile foundation:
-- 1) Canonical handle support for gigger/public profiles
-- 2) Resolver RPC to map /profile/:handle to user + available roles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS handle text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle_unique
ON public.profiles (lower(handle))
WHERE handle IS NOT NULL;

CREATE OR REPLACE FUNCTION public.slugify_profile_handle(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
BEGIN
  v := lower(coalesce(input, ''));
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '(^-|-$)', '', 'g');
  IF length(v) < 3 THEN
    RETURN NULL;
  END IF;
  RETURN left(v, 32);
END;
$$;

DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, split_part(u.email, '@', 1) AS email_local
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.handle IS NULL OR btrim(p.handle) = ''
  LOOP
    base := public.slugify_profile_handle(coalesce(r.full_name, r.email_local, 'user'));
    IF base IS NULL THEN
      base := 'user';
    END IF;
    candidate := base;
    n := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE lower(p2.handle) = lower(candidate)
        AND p2.id <> r.id
    ) LOOP
      n := n + 1;
      candidate := left(base, 26) || '-' || lpad(n::text, 3, '0');
    END LOOP;
    UPDATE public.profiles
    SET handle = candidate
    WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_profile_handle(_handle text)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  canonical_handle text,
  has_digger boolean,
  has_gigger boolean,
  digger_profile_id uuid,
  digger_handle text,
  gigger_handle text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH h AS (
    SELECT lower(trim(_handle)) AS handle
  ),
  by_digger AS (
    SELECT
      dp.user_id,
      p.full_name,
      p.avatar_url,
      COALESCE(NULLIF(dp.handle, ''), NULLIF(p.handle, ''), h.handle) AS canonical_handle,
      true AS has_digger,
      true AS has_gigger,
      dp.id AS digger_profile_id,
      dp.handle AS digger_handle,
      p.handle AS gigger_handle
    FROM h
    JOIN public.digger_profiles dp ON lower(dp.handle) = h.handle
    LEFT JOIN public.profiles p ON p.id = dp.user_id
    LIMIT 1
  ),
  by_profile AS (
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      COALESCE(NULLIF(p.handle, ''), h.handle) AS canonical_handle,
      EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.user_id = p.id) AS has_digger,
      true AS has_gigger,
      (SELECT dp.id FROM public.digger_profiles dp WHERE dp.user_id = p.id ORDER BY dp.created_at ASC LIMIT 1) AS digger_profile_id,
      (SELECT dp.handle FROM public.digger_profiles dp WHERE dp.user_id = p.id ORDER BY dp.created_at ASC LIMIT 1) AS digger_handle,
      p.handle AS gigger_handle
    FROM h
    JOIN public.profiles p ON lower(p.handle) = h.handle
    LIMIT 1
  )
  SELECT * FROM by_digger
  UNION ALL
  SELECT * FROM by_profile
  WHERE NOT EXISTS (SELECT 1 FROM by_digger)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_profile_handle(text) TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_profile_handle(text)
IS 'Resolve canonical profile handle to user identity and role availability for hybrid profile routing.';
