-- Add lead volume planning fields to digger_profiles
ALTER TABLE digger_profiles 
ADD COLUMN IF NOT EXISTS expected_lead_volume INTEGER,
ADD COLUMN IF NOT EXISTS expected_lead_period TEXT DEFAULT 'monthly' CHECK (expected_lead_period IN ('daily', 'weekly', 'monthly'));

-- Add comments to document the fields
COMMENT ON COLUMN digger_profiles.expected_lead_volume IS 'Number of leads the digger plans to purchase in the specified period';
COMMENT ON COLUMN digger_profiles.expected_lead_period IS 'Time period for expected lead volume: daily, weekly, or monthly';