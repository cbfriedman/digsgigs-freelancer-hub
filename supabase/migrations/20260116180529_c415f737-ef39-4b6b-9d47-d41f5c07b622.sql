-- Create a cron job to check for expired awards every 15 minutes
-- Note: This requires pg_cron extension which is enabled in Supabase

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cron job to run every 15 minutes
SELECT cron.schedule(
  'process-expired-awards',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://ibyhvkfrbdwrnxutnkdy.supabase.co/functions/v1/process-expired-awards-cron',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);