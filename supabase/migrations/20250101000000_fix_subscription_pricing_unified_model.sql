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

-- Update subscription_pricing table to match new unified pricing model
UPDATE public.subscription_pricing
SET 
  monthly_price_cents = CASE 
    WHEN geographic_tier = 'local' THEN 2900        -- $29/month
    WHEN geographic_tier = 'statewide' THEN 5900  -- $59/month
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

-- Verify the update
SELECT 
  geographic_tier,
  industry_type,
  monthly_price_cents / 100.0 as monthly_price_dollars,
  annual_price_cents / 100.0 as annual_price_dollars,
  is_active
FROM subscription_pricing
ORDER BY geographic_tier, industry_type;

-- Note: The industry_type column is kept for backward compatibility
-- but pricing is now unified (same for lv_mv and hv)

