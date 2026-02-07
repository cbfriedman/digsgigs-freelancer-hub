-- Admin-configurable settings for message email notifications (throttle and delay in minutes).
CREATE TABLE IF NOT EXISTS public.message_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  throttle_minutes INT NOT NULL DEFAULT 30 CHECK (throttle_minutes >= 0),
  delay_minutes INT NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view message notification settings"
  ON public.message_notification_settings FOR SELECT TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update message notification settings"
  ON public.message_notification_settings FOR UPDATE TO authenticated
  USING (public.has_app_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_app_role(auth.uid(), 'admin'));

-- Insert single row (admin will update via dashboard). Id is fixed so admin UI can always update it.
INSERT INTO public.message_notification_settings (id, throttle_minutes, delay_minutes)
VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 30, 0)
ON CONFLICT (id) DO NOTHING;

-- Queue for delayed send: processor runs every minute and sends when send_after <= now().
CREATE TABLE IF NOT EXISTS public.message_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  send_after TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_notification_queue_send_after_sent
  ON public.message_notification_queue (send_after) WHERE sent_at IS NULL;

ALTER TABLE public.message_notification_queue ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (Edge Functions) read/write. App does not touch queue directly.
COMMENT ON TABLE public.message_notification_settings IS 'Admin-configured: throttle_minutes (min gap between emails per conversation), delay_minutes (wait before sending).';
COMMENT ON TABLE public.message_notification_queue IS 'Queue for delayed message email notifications; processed by cron every minute.';
