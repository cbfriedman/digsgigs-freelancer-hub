-- =====================================================
-- FIX SUBSCRIPTION PRICING TO MATCH NEW UNIFIED MODEL
-- 
-- New Business Model (UNIFIED - Same for all industries):
-- - Local: $29/month ($290/year)
-- - Statewide: $59/month ($590/year) + $15/additional state (max $199/mo)
-- - Nationwide: $299/month ($2,990/year)
-- 
-- Industry type (lv_mv vs hv) no longer affects subscription pricing
-- =====================================================

-- Only update if subscription_pricing exists (safe for projects that don't have this table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscription_pricing'
  ) THEN
    UPDATE public.subscription_pricing
    SET
      monthly_price_cents = CASE
        WHEN geographic_tier = 'local' THEN 2900        -- $29/month
        WHEN geographic_tier = 'statewide' THEN 5900   -- $59/month
        WHEN geographic_tier = 'nationwide' THEN 29900 -- $299/month
        ELSE monthly_price_cents
      END,
      annual_price_cents = CASE
        WHEN geographic_tier = 'local' THEN 29000        -- $290/year (2 months free)
        WHEN geographic_tier = 'statewide' THEN 59000    -- $590/year (2 months free)
        WHEN geographic_tier = 'nationwide' THEN 299000  -- $2,990/year (2 months free)
        ELSE annual_price_cents
      END,
      updated_at = now()
    WHERE geographic_tier IN ('local', 'statewide', 'nationwide');
  END IF;
END $$;

-- Note: The industry_type column is kept for backward compatibility
-- but pricing is now unified (same for lv_mv and hv)

