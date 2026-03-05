-- Admin-configurable Stripe mode: test (sandbox) or live.
-- Edge Functions read this and use STRIPE_SECRET_KEY_TEST / STRIPE_SECRET_KEY_LIVE (and webhook secrets) from Supabase secrets.
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'stripe_mode',
  '{"mode": "test"}'::jsonb,
  'Stripe API mode: "test" (sandbox) or "live". Admin can switch via Admin Dashboard > Stripe mode.'
)
ON CONFLICT (key) DO NOTHING;
