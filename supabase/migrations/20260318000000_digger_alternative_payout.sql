-- Alternative payout for Diggers in countries where Stripe Connect is not supported
-- (e.g. South Africa, Indonesia). Provider: stripe | paypal | payoneer | wise.
ALTER TABLE public.digger_profiles
  ADD COLUMN IF NOT EXISTS payout_provider text DEFAULT 'stripe' NOT NULL,
  ADD COLUMN IF NOT EXISTS payout_email text,
  ADD COLUMN IF NOT EXISTS payout_external_id text;

COMMENT ON COLUMN public.digger_profiles.payout_provider IS 'Primary payout method: stripe (Connect), paypal, payoneer, or wise.';
COMMENT ON COLUMN public.digger_profiles.payout_email IS 'PayPal email or Wise/Payoneer contact email for alternative payouts.';
COMMENT ON COLUMN public.digger_profiles.payout_external_id IS 'Payoneer/Wise recipient ID when applicable.';
