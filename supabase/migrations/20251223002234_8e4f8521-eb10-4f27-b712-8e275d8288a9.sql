-- Add geographic subscription columns to digger_profiles
ALTER TABLE public.digger_profiles 
ADD COLUMN IF NOT EXISTS geographic_tier TEXT DEFAULT 'local',
ADD COLUMN IF NOT EXISTS industry_type TEXT DEFAULT 'lv_mv',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS price_locked BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS price_lock_notified_30d BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_lock_notified_7d BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add check constraints
ALTER TABLE public.digger_profiles 
DROP CONSTRAINT IF EXISTS digger_profiles_geographic_tier_check;
ALTER TABLE public.digger_profiles 
ADD CONSTRAINT digger_profiles_geographic_tier_check 
CHECK (geographic_tier IN ('local', 'statewide', 'nationwide'));

ALTER TABLE public.digger_profiles 
DROP CONSTRAINT IF EXISTS digger_profiles_industry_type_check;
ALTER TABLE public.digger_profiles 
ADD CONSTRAINT digger_profiles_industry_type_check 
CHECK (industry_type IN ('lv_mv', 'hv'));

ALTER TABLE public.digger_profiles 
DROP CONSTRAINT IF EXISTS digger_profiles_billing_cycle_check;
ALTER TABLE public.digger_profiles 
ADD CONSTRAINT digger_profiles_billing_cycle_check 
CHECK (billing_cycle IN ('monthly', 'annual'));

-- Create digger_monthly_clicks table
CREATE TABLE IF NOT EXISTS public.digger_monthly_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(digger_id, month_year)
);

-- Enable RLS
ALTER TABLE public.digger_monthly_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies for digger_monthly_clicks
CREATE POLICY "Diggers can view their own click stats"
ON public.digger_monthly_clicks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.digger_profiles dp 
    WHERE dp.id = digger_monthly_clicks.digger_id 
    AND dp.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage click stats"
ON public.digger_monthly_clicks
FOR ALL
USING (true)
WITH CHECK (true);

-- Create subscription_pricing table for admin-editable rates
CREATE TABLE IF NOT EXISTS public.subscription_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geographic_tier TEXT NOT NULL,
  industry_type TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  annual_price_cents INTEGER NOT NULL,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(geographic_tier, industry_type)
);

-- Enable RLS
ALTER TABLE public.subscription_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_pricing (public read, admin write)
CREATE POLICY "Anyone can view subscription pricing"
ON public.subscription_pricing
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage subscription pricing"
ON public.subscription_pricing
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Insert default pricing
INSERT INTO public.subscription_pricing (geographic_tier, industry_type, monthly_price_cents, annual_price_cents)
VALUES 
  ('local', 'lv_mv', 1900, 19000),
  ('local', 'hv', 3900, 39000),
  ('statewide', 'lv_mv', 4900, 49000),
  ('statewide', 'hv', 9900, 99000),
  ('nationwide', 'lv_mv', 9900, 99000),
  ('nationwide', 'hv', 19900, 199000)
ON CONFLICT (geographic_tier, industry_type) DO NOTHING;

-- Create updated_at trigger for new tables
CREATE TRIGGER update_digger_monthly_clicks_updated_at
BEFORE UPDATE ON public.digger_monthly_clicks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_pricing_updated_at
BEFORE UPDATE ON public.subscription_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_digger_monthly_clicks_digger_month 
ON public.digger_monthly_clicks(digger_id, month_year);

CREATE INDEX IF NOT EXISTS idx_digger_profiles_geographic_tier 
ON public.digger_profiles(geographic_tier);

CREATE INDEX IF NOT EXISTS idx_digger_profiles_subscription_status 
ON public.digger_profiles(subscription_status);