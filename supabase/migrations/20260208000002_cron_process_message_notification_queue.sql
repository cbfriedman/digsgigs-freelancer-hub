-- Run message notification queue processor every minute (sends delayed email alerts).
-- Requires pg_cron and pg_net. Use your Supabase project URL if different from ibyhvkfrbdwrnxutnkdy; set app.settings.service_role_key in dashboard.
SELECT cron.schedule(
  'process-message-notification-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ibyhvkfrbdwrnxutnkdy.supabase.co/functions/v1/process-message-notification-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
