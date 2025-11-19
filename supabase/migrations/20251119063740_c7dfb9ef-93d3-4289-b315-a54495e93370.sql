-- Add monthly lead tracking to digger_profiles
ALTER TABLE digger_profiles 
ADD COLUMN IF NOT EXISTS monthly_lead_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_lead_count_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to determine tier based on lead count
CREATE OR REPLACE FUNCTION get_tier_for_lead_count(lead_count INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF lead_count < 10 THEN
    RETURN 'free';
  ELSIF lead_count >= 10 AND lead_count < 50 THEN
    RETURN 'pro';
  ELSE
    RETURN 'premium';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to reset monthly lead counts
CREATE OR REPLACE FUNCTION reset_monthly_lead_counts()
RETURNS void AS $$
BEGIN
  UPDATE digger_profiles
  SET monthly_lead_count = 0,
      last_lead_count_reset = NOW()
  WHERE EXTRACT(DAY FROM NOW() AT TIME ZONE 'America/New_York') = EXTRACT(DAY FROM (DATE_TRUNC('month', NOW() AT TIME ZONE 'America/New_York') + INTERVAL '1 month - 1 day'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_digger_profiles_monthly_lead_count ON digger_profiles(monthly_lead_count);

-- Comment to document the pricing model
COMMENT ON COLUMN digger_profiles.monthly_lead_count IS 'Tracks leads received in current month. Resets midnight EST last day of month. Determines tier: <10=free, 10-49=pro, 50+=premium';