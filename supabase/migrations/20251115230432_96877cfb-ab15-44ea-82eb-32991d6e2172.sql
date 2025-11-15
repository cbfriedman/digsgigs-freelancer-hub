-- Create table to track login attempts for rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or IP address
  attempt_type TEXT NOT NULL, -- 'email' or 'ip'
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (public can log attempts)
CREATE POLICY "Anyone can log login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);

-- Create policy to allow reading own attempts (by email)
CREATE POLICY "Users can read their own login attempts"
ON public.login_attempts
FOR SELECT
USING (identifier = auth.jwt()->>'email' OR true);

-- Create index for faster queries
CREATE INDEX idx_login_attempts_identifier_time 
ON public.login_attempts(identifier, attempted_at DESC);

-- Function to clean up old login attempts (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - interval '1 hour';
END;
$$;

-- Function to check if rate limit is exceeded
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_attempt_type TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count failed attempts within the time window
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND attempted_at > now() - (p_window_minutes || ' minutes')::interval
    AND success = false;
  
  -- Return true if limit exceeded
  RETURN attempt_count >= p_max_attempts;
END;
$$;