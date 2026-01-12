-- Create early_access_applications table for YouTube ad landing page
CREATE TABLE IF NOT EXISTS public.early_access_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  skill_category TEXT NOT NULL,
  years_experience TEXT NOT NULL,
  portfolio_linkedin TEXT,
  location TEXT NOT NULL,
  source TEXT DEFAULT 'youtube_landing',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'contacted')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.early_access_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow anonymous inserts (for landing page form)
CREATE POLICY "Anyone can create early access applications"
  ON public.early_access_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies: Only admins can view all applications
CREATE POLICY "Admins can view all early access applications"
  ON public.early_access_applications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: Only admins can update applications
CREATE POLICY "Admins can update early access applications"
  ON public.early_access_applications
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_early_access_applications_email ON public.early_access_applications(email);
CREATE INDEX idx_early_access_applications_status ON public.early_access_applications(status);
CREATE INDEX idx_early_access_applications_created_at ON public.early_access_applications(created_at DESC);
CREATE INDEX idx_early_access_applications_source ON public.early_access_applications(source);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_early_access_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_early_access_applications_updated_at
  BEFORE UPDATE ON public.early_access_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_early_access_applications_updated_at();
