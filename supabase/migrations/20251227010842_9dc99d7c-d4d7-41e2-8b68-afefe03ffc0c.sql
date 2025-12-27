-- Create table to track digger onboarding email sequence
CREATE TABLE IF NOT EXISTS public.digger_onboarding_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  digger_profile_id UUID REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  step_1_sent_at TIMESTAMP WITH TIME ZONE,
  step_2_sent_at TIMESTAMP WITH TIME ZONE,
  step_3_sent_at TIMESTAMP WITH TIME ZONE,
  step_4_sent_at TIMESTAMP WITH TIME ZONE,
  step_5_sent_at TIMESTAMP WITH TIME ZONE,
  step_6_sent_at TIMESTAMP WITH TIME ZONE,
  step_7_sent_at TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digger_onboarding_emails ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own records
CREATE POLICY "Users can view their own onboarding emails"
ON public.digger_onboarding_emails
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for service role to manage all records
CREATE POLICY "Service role can manage all onboarding emails"
ON public.digger_onboarding_emails
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX idx_digger_onboarding_emails_user_id ON public.digger_onboarding_emails(user_id);
CREATE INDEX idx_digger_onboarding_emails_current_step ON public.digger_onboarding_emails(current_step);

-- Add trigger for updated_at
CREATE TRIGGER update_digger_onboarding_emails_updated_at
BEFORE UPDATE ON public.digger_onboarding_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();