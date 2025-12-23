-- Create profile_emails table to track email contact actions
CREATE TABLE IF NOT EXISTS public.profile_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  digger_profile_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  keyword_matched TEXT,
  google_avg_cpc_cents INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_emails ENABLE ROW LEVEL SECURITY;

-- Policies: Diggers can view emails to their profiles, consumers can view their own emails
CREATE POLICY "Diggers can view emails to their profiles"
ON public.profile_emails
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.digger_profiles dp
    WHERE dp.id = profile_emails.digger_profile_id
    AND dp.user_id = auth.uid()
  )
);

CREATE POLICY "Consumers can view their own email actions"
ON public.profile_emails
FOR SELECT
USING (consumer_id = auth.uid());

CREATE POLICY "Authenticated users can create email records"
ON public.profile_emails
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add index for performance
CREATE INDEX idx_profile_emails_digger_profile_id ON public.profile_emails(digger_profile_id);
CREATE INDEX idx_profile_emails_consumer_id ON public.profile_emails(consumer_id);
CREATE INDEX idx_profile_emails_created_at ON public.profile_emails(created_at DESC);