-- Run this SQL in Supabase Dashboard -> SQL Editor
-- This fixes the verification_codes table to support both email and phone verification

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'verification_codes' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.verification_codes ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Make email nullable (since we can use phone instead)
ALTER TABLE public.verification_codes ALTER COLUMN email DROP NOT NULL;

-- Add verification_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'verification_codes' 
    AND column_name = 'verification_type'
  ) THEN
    ALTER TABLE public.verification_codes 
    ADD COLUMN verification_type TEXT NOT NULL DEFAULT 'email';
  END IF;
END $$;

-- Add check constraint for verification_type
ALTER TABLE public.verification_codes 
DROP CONSTRAINT IF EXISTS verification_codes_verification_type_check;

ALTER TABLE public.verification_codes 
ADD CONSTRAINT verification_codes_verification_type_check 
CHECK (verification_type IN ('email', 'sms'));

-- Add constraint to ensure either email or phone is provided
ALTER TABLE public.verification_codes 
DROP CONSTRAINT IF EXISTS email_or_phone_required;

ALTER TABLE public.verification_codes 
ADD CONSTRAINT email_or_phone_required 
CHECK (
  (email IS NOT NULL AND phone IS NULL) OR 
  (email IS NULL AND phone IS NOT NULL)
);

-- Create index for phone if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone 
ON public.verification_codes(phone) 
WHERE phone IS NOT NULL;

-- Update existing indexes to handle nullable email
DROP INDEX IF EXISTS idx_verification_codes_email;
CREATE INDEX IF NOT EXISTS idx_verification_codes_email 
ON public.verification_codes(email) 
WHERE email IS NOT NULL;

