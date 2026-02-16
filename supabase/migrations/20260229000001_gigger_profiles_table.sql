-- Gigger-only profile: visibility and optional cached stats.
-- Identity (photo, country, timezone, verification) stays on profiles (one per user).

CREATE TABLE IF NOT EXISTS public.gigger_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_to_diggers boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gigger_profiles IS 'Per-user Gigger settings. One row when user has Gigger role. Project counts are computed from gigs.';

-- RLS: users can read/update their own row; Diggers can read when show_to_diggers is true (e.g. when viewing a gig).
ALTER TABLE public.gigger_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY gigger_profiles_select_own
  ON public.gigger_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY gigger_profiles_update_own
  ON public.gigger_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY gigger_profiles_insert_own
  ON public.gigger_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Diggers viewing a gig can see the gig owner's gigger_profile (for show_to_diggers and future fields).
-- We allow SELECT for any authenticated user when show_to_diggers is true; stricter checks (e.g. only when on gig page) are in app.
CREATE POLICY gigger_profiles_select_visible
  ON public.gigger_profiles FOR SELECT
  TO authenticated
  USING (show_to_diggers = true);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_gigger_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gigger_profiles_updated_at ON public.gigger_profiles;
CREATE TRIGGER gigger_profiles_updated_at
  BEFORE UPDATE ON public.gigger_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_gigger_profiles_updated_at();
