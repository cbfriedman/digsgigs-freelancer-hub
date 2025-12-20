-- Create campaign_conversions table for tracking email campaign effectiveness
CREATE TABLE public.campaign_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  conversion_type TEXT NOT NULL, -- 'page_view', 'email_capture', 'signup', 'gig_posted', 'digger_registered'
  landing_page TEXT,
  referrer TEXT,
  device_type TEXT,
  browser TEXT,
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.campaign_conversions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking (no auth required to log conversions)
CREATE POLICY "Allow anonymous inserts for campaign tracking"
ON public.campaign_conversions
FOR INSERT
WITH CHECK (true);

-- Allow users to view their own conversions
CREATE POLICY "Users can view their own conversions"
ON public.campaign_conversions
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to view all conversions
CREATE POLICY "Admins can view all conversions"
ON public.campaign_conversions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for analytics queries
CREATE INDEX idx_campaign_conversions_utm_source ON public.campaign_conversions(utm_source);
CREATE INDEX idx_campaign_conversions_utm_campaign ON public.campaign_conversions(utm_campaign);
CREATE INDEX idx_campaign_conversions_conversion_type ON public.campaign_conversions(conversion_type);
CREATE INDEX idx_campaign_conversions_created_at ON public.campaign_conversions(created_at DESC);