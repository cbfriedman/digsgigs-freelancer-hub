-- Admin-configurable period (days) for milestone auto-release. Stored in platform_settings.
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'milestone_auto_release_days',
  '{"days": 14}'::jsonb,
  'Number of days after the Digger submits a milestone before payment is auto-released to them if the Gigger has not approved or disputed. Min 7, max 60. Used by auto-release-milestones cron.'
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();
-- Do not overwrite value on conflict so existing admin edits are preserved.

-- Public RPC so the app can display the configured period to users (e.g. "within 14 days").
CREATE OR REPLACE FUNCTION public.get_milestone_auto_release_days()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (value->>'days')::integer FROM public.platform_settings WHERE key = 'milestone_auto_release_days' LIMIT 1),
    14
  );
$$;

COMMENT ON FUNCTION public.get_milestone_auto_release_days() IS 'Returns the configured number of days for milestone auto-release (7–60). Used by cron and by UI to show "within X days". Default 14.';
