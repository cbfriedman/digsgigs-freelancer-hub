-- Backfill payment_verified for users who already have at least one payment method
-- so the Verification card shows Payment as green on their profile
UPDATE public.profiles
SET payment_verified = true
WHERE id IN (SELECT user_id FROM public.payment_methods)
  AND (payment_verified IS NULL OR payment_verified = false);
