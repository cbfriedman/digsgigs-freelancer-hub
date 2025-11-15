-- Create table to track profile completion reminder emails
CREATE TABLE IF NOT EXISTS public.profile_completion_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('3_day', '7_day', '14_day')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  profile_completion_at_send INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profile_reminders_digger_id ON public.profile_completion_reminders(digger_id);
CREATE INDEX IF NOT EXISTS idx_profile_reminders_sent_at ON public.profile_completion_reminders(sent_at);

-- Enable RLS
ALTER TABLE public.profile_completion_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reminders
CREATE POLICY "Users can view own reminders"
  ON public.profile_completion_reminders
  FOR SELECT
  USING (
    digger_id IN (
      SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.profile_completion_reminders IS 'Tracks profile completion reminder emails sent to diggers';