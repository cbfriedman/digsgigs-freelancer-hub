-- Security Fix: Add OTP Rate Limiting to Prevent Brute Force Attacks
-- This migration adds rate limiting for OTP verification attempts

-- ============================================
-- Create OTP Verification Attempts Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.otp_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_or_phone_required CHECK (
    (email IS NOT NULL AND phone IS NULL) OR
    (email IS NULL AND phone IS NOT NULL)
  )
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_otp_attempts_email ON public.otp_verification_attempts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_otp_attempts_phone ON public.otp_verification_attempts(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_otp_attempts_locked ON public.otp_verification_attempts(locked_until) WHERE locked_until IS NOT NULL;

-- Create unique indexes to prevent duplicate entries (separate for email and phone)
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_attempts_email_unique ON public.otp_verification_attempts(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_attempts_phone_unique ON public.otp_verification_attempts(phone) WHERE phone IS NOT NULL;

-- Enable RLS
ALTER TABLE public.otp_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access this table (for edge functions)
CREATE POLICY "Service role can manage OTP attempts"
  ON public.otp_verification_attempts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- Create Function to Check and Update Attempts
-- ============================================

CREATE OR REPLACE FUNCTION public.check_otp_attempt_limit(
  _email TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempt_record RECORD;
  MAX_ATTEMPTS INTEGER := 5;
  LOCKOUT_MINUTES INTEGER := 15;
  _is_locked BOOLEAN := false;
  _attempts_remaining INTEGER;
BEGIN
  -- Validate input
  IF (_email IS NULL AND _phone IS NULL) THEN
    RAISE EXCEPTION 'Either email or phone must be provided';
  END IF;

  -- Find or create attempt record
  IF _email IS NOT NULL THEN
    SELECT * INTO _attempt_record
    FROM public.otp_verification_attempts
    WHERE email = _email
    FOR UPDATE;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
      INSERT INTO public.otp_verification_attempts (email, phone, attempt_count, last_attempt_at)
      VALUES (_email, NULL, 0, now())
      RETURNING * INTO _attempt_record;
    END IF;
  ELSE
    SELECT * INTO _attempt_record
    FROM public.otp_verification_attempts
    WHERE phone = _phone
    FOR UPDATE;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
      INSERT INTO public.otp_verification_attempts (email, phone, attempt_count, last_attempt_at)
      VALUES (NULL, _phone, 0, now())
      RETURNING * INTO _attempt_record;
    END IF;
  END IF;

  -- Check if account is locked
  IF _attempt_record.locked_until IS NOT NULL AND _attempt_record.locked_until > now() THEN
    _is_locked := true;
    RETURN jsonb_build_object(
      'allowed', false,
      'locked', true,
      'locked_until', _attempt_record.locked_until,
      'message', 'Too many failed attempts. Account locked. Please try again later.'
    );
  END IF;

  -- Reset lock if it has expired
  IF _attempt_record.locked_until IS NOT NULL AND _attempt_record.locked_until <= now() THEN
    UPDATE public.otp_verification_attempts
    SET attempt_count = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE id = _attempt_record.id;
    _attempt_record.attempt_count := 0;
    _attempt_record.locked_until := NULL;
  END IF;

  -- Check if max attempts reached
  IF _attempt_record.attempt_count >= MAX_ATTEMPTS THEN
    -- Lock the account
    UPDATE public.otp_verification_attempts
    SET locked_until = now() + (LOCKOUT_MINUTES || ' minutes')::INTERVAL,
        updated_at = now()
    WHERE id = _attempt_record.id;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'locked', true,
      'locked_until', now() + (LOCKOUT_MINUTES || ' minutes')::INTERVAL,
      'message', format('Too many failed attempts. Account locked for %s minutes.', LOCKOUT_MINUTES)
    );
  END IF;

  -- Calculate remaining attempts
  _attempts_remaining := MAX_ATTEMPTS - _attempt_record.attempt_count;

  RETURN jsonb_build_object(
    'allowed', true,
    'locked', false,
    'attempt_count', _attempt_record.attempt_count,
    'attempts_remaining', _attempts_remaining
  );
END;
$$;

-- ============================================
-- Create Function to Record Failed Attempt
-- ============================================

CREATE OR REPLACE FUNCTION public.record_otp_failed_attempt(
  _email TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF (_email IS NULL AND _phone IS NULL) THEN
    RAISE EXCEPTION 'Either email or phone must be provided';
  END IF;

  -- Increment attempt count (use upsert pattern with proper conflict handling)
  IF _email IS NOT NULL THEN
    -- Try to update existing record first
    UPDATE public.otp_verification_attempts
    SET attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        updated_at = now()
    WHERE email = _email;
    
    -- If no record was updated, insert new one
    IF NOT FOUND THEN
      INSERT INTO public.otp_verification_attempts (email, phone, attempt_count, last_attempt_at)
      VALUES (_email, NULL, 1, now());
    END IF;
  ELSE
    -- Try to update existing record first
    UPDATE public.otp_verification_attempts
    SET attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        updated_at = now()
    WHERE phone = _phone;
    
    -- If no record was updated, insert new one
    IF NOT FOUND THEN
      INSERT INTO public.otp_verification_attempts (email, phone, attempt_count, last_attempt_at)
      VALUES (NULL, _phone, 1, now());
    END IF;
  END IF;
END;
$$;

-- ============================================
-- Create Function to Reset Attempts on Success
-- ============================================

CREATE OR REPLACE FUNCTION public.reset_otp_attempts(
  _email TEXT DEFAULT NULL,
  _phone TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF (_email IS NULL AND _phone IS NULL) THEN
    RAISE EXCEPTION 'Either email or phone must be provided';
  END IF;

  -- Reset attempt count and lock
  IF _email IS NOT NULL THEN
    UPDATE public.otp_verification_attempts
    SET attempt_count = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE email = _email;
  ELSE
    UPDATE public.otp_verification_attempts
    SET attempt_count = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE phone = _phone;
  END IF;
END;
$$;

-- ============================================
-- Add Comments
-- ============================================

COMMENT ON TABLE public.otp_verification_attempts IS 
'SECURITY: Tracks OTP verification attempts to prevent brute force attacks.
- Max 5 attempts before 15-minute lockout
- Attempts reset on successful verification
- Lockout expires automatically';

COMMENT ON FUNCTION public.check_otp_attempt_limit IS 
'Checks if OTP verification is allowed based on attempt history.
Returns JSONB with allowed status, lock status, and remaining attempts.';

COMMENT ON FUNCTION public.record_otp_failed_attempt IS 
'Records a failed OTP verification attempt and increments the counter.';

COMMENT ON FUNCTION public.reset_otp_attempts IS 
'Resets OTP attempt counter and lock status after successful verification.';

