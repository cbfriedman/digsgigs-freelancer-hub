-- Allow verification_type 'phone' so send-otp can store SMS OTPs (it uses 'phone' for method 'sms').
-- Some migration paths left the constraint as ('email', 'sms') only, causing "violates check constraint" when sending phone verification.

ALTER TABLE public.verification_codes
  DROP CONSTRAINT IF EXISTS verification_codes_verification_type_check;

ALTER TABLE public.verification_codes
  ADD CONSTRAINT verification_codes_verification_type_check
  CHECK (verification_type IN ('email', 'phone', 'sms', 'registration'));

COMMENT ON CONSTRAINT verification_codes_verification_type_check ON public.verification_codes IS
  'email = email OTP, phone/sms = SMS OTP (send-otp uses phone), registration = signup flow.';
