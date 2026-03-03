-- Keep profiles.payment_verified in sync when payment_methods change
-- so admin (and others) always see correct payment status without relying on edge function.

CREATE OR REPLACE FUNCTION public.sync_payment_verified_on_payment_methods()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    uid := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    uid := OLD.user_id;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.profiles
  SET payment_verified = EXISTS (
    SELECT 1 FROM public.payment_methods WHERE user_id = uid
  )
  WHERE id = uid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_payment_verified_trigger ON public.payment_methods;
CREATE TRIGGER sync_payment_verified_trigger
  AFTER INSERT OR DELETE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payment_verified_on_payment_methods();

-- Backfill again so any existing payment_methods rows set payment_verified = true
UPDATE public.profiles
SET payment_verified = true
WHERE id IN (SELECT user_id FROM public.payment_methods)
  AND (payment_verified IS NULL OR payment_verified = false);
