-- Create verification codes table for custom OTP flow
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert verification codes (during registration)
CREATE POLICY "Anyone can create verification codes"
  ON public.verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own verification codes
CREATE POLICY "Users can view own verification codes"
  ON public.verification_codes
  FOR SELECT
  USING (email = (auth.jwt() ->> 'email'::text) OR user_id = auth.uid());

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < now();
END;
$$;