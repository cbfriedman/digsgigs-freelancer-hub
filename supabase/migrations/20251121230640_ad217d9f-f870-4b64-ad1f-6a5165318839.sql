-- Update the verification_codes table constraint to allow 'registration' as a valid verification_type
ALTER TABLE public.verification_codes 
DROP CONSTRAINT IF EXISTS verification_codes_verification_type_check;

ALTER TABLE public.verification_codes
ADD CONSTRAINT verification_codes_verification_type_check 
CHECK (verification_type IN ('email', 'phone', 'registration'));