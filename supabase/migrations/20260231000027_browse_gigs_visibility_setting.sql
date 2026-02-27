-- Admin-controlled visibility of gig statuses on Browse Gigs (for diggers).
-- Default: only "open" gigs are shown. Admin can allow "awarded" and/or "in_progress".

INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'browse_gigs_visibility',
  '{"show_awarded": false, "show_in_progress": false}'::jsonb,
  'Which gig statuses appear on Browse Gigs for diggers: show_awarded, show_in_progress. Default both false = only open gigs.'
)
ON CONFLICT (key) DO NOTHING;

-- RPC so any authenticated user can read allowed statuses (RLS blocks direct read of platform_settings for non-admins)
CREATE OR REPLACE FUNCTION public.get_browse_gigs_statuses()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ARRAY['open']
        || CASE WHEN (value->>'show_awarded')::boolean THEN ARRAY['awarded'] ELSE ARRAY[]::text[] END
        || CASE WHEN (value->>'show_in_progress')::boolean THEN ARRAY['in_progress'] ELSE ARRAY[]::text[] END
      FROM public.platform_settings
      WHERE key = 'browse_gigs_visibility'
      LIMIT 1
    ),
    ARRAY['open']
  );
$$;

COMMENT ON FUNCTION public.get_browse_gigs_statuses() IS
  'Returns gig statuses allowed on Browse Gigs page. Driven by platform_settings.browse_gigs_visibility (admin-only edit).';

GRANT EXECUTE ON FUNCTION public.get_browse_gigs_statuses() TO anon, authenticated;
