-- Run auto-release-milestones daily: release payment to Digger when Gigger has not approved or disputed within 14 days.
-- Requires pg_cron and pg_net. Uses same project URL and app.settings.service_role_key as other cron jobs.
SELECT cron.schedule(
  'auto-release-milestones',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ibyhvkfrbdwrnxutnkdy.supabase.co/functions/v1/auto-release-milestones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
