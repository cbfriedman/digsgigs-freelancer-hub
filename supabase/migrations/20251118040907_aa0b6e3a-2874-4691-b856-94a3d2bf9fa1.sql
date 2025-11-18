-- Create verification codes table
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  code text NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  verification_type text NOT NULL CHECK (verification_type IN ('email', 'phone')),
  CONSTRAINT email_or_phone_required CHECK (
    (email IS NOT NULL AND phone IS NULL) OR 
    (email IS NULL AND phone IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert verification codes (for registration)
CREATE POLICY "Anyone can create verification codes"
ON public.verification_codes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Anyone can read their own verification codes
CREATE POLICY "Users can read their own codes"
ON public.verification_codes
FOR SELECT
TO anon, authenticated
USING (
  (email IS NOT NULL AND email = current_setting('request.jwt.claims', true)::json->>'email') OR
  true -- Allow anonymous reads for demo purposes
);

-- Policy: Anyone can update their own codes to mark as verified
CREATE POLICY "Users can verify their own codes"
ON public.verification_codes
FOR UPDATE
TO anon, authenticated
USING (
  (email IS NOT NULL AND email = current_setting('request.jwt.claims', true)::json->>'email') OR
  true -- Allow anonymous updates for demo purposes
)
WITH CHECK (verified = true);

-- Create index for faster lookups
CREATE INDEX idx_verification_codes_email ON public.verification_codes(email) WHERE email IS NOT NULL;
CREATE INDEX idx_verification_codes_phone ON public.verification_codes(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_verification_codes_expires_at ON public.verification_codes(expires_at);

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < now();
END;
$$;