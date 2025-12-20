-- Create marketing email log table
CREATE TABLE public.marketing_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_type text NOT NULL CHECK (email_type IN ('marketing', 'reengagement')),
  reason text,
  campaign_name text,
  sent_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Add index for querying by email type
CREATE INDEX idx_marketing_email_log_type ON public.marketing_email_log(email_type);
CREATE INDEX idx_marketing_email_log_sent_at ON public.marketing_email_log(sent_at DESC);

-- Enable RLS
ALTER TABLE public.marketing_email_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view marketing email logs
CREATE POLICY "Admins can view all marketing email logs"
ON public.marketing_email_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_app_roles
    WHERE user_id = auth.uid()
      AND app_role = 'admin'
      AND is_active = true
  )
);

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert marketing email logs"
ON public.marketing_email_log
FOR INSERT
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.marketing_email_log IS 'Tracks all marketing and re-engagement emails sent';