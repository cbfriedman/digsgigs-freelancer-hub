-- Store Stripe Connect account and status for live mode separately from test.
-- When platform is in live mode, payments use stripe_connect_account_id_live so test/live accounts don't mix.
ALTER TABLE public.digger_profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id_live text,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled_live boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded_live boolean DEFAULT false;

COMMENT ON COLUMN public.digger_profiles.stripe_connect_account_id_live IS 'Stripe Connect account ID when platform uses live keys; used for payouts in live mode.';
COMMENT ON COLUMN public.digger_profiles.stripe_connect_charges_enabled_live IS 'Whether the live Connect account can receive charges (synced from Stripe).';
COMMENT ON COLUMN public.digger_profiles.stripe_connect_onboarded_live IS 'Whether the live Connect account has completed onboarding.';
