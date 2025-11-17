-- Add notification preference columns to email_preferences table
ALTER TABLE public.email_preferences
ADD COLUMN IF NOT EXISTS keyword_requests_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS lead_issues_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS bid_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS system_alerts_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.email_preferences.keyword_requests_enabled IS 'Receive emails when users request new keyword suggestions';
COMMENT ON COLUMN public.email_preferences.profile_reminders_enabled IS 'Receive emails related to profile completion reminders';
COMMENT ON COLUMN public.email_preferences.lead_issues_enabled IS 'Receive emails about lead return requests and issues';
COMMENT ON COLUMN public.email_preferences.bid_notifications_enabled IS 'Receive emails about new bids and bid updates';
COMMENT ON COLUMN public.email_preferences.system_alerts_enabled IS 'Receive critical system alerts and notifications';