-- Store digger social profiles as a JSON object.
ALTER TABLE public.digger_profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb;

COMMENT ON COLUMN public.digger_profiles.social_links IS
  'Optional social profile links keyed by platform (linkedin, twitter, instagram, facebook, youtube, tiktok).';
