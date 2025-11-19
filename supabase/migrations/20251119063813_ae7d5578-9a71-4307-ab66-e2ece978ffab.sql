-- Fix search_path for functions to address security warnings
DROP FUNCTION IF EXISTS get_tier_for_lead_count(INTEGER);
DROP FUNCTION IF EXISTS reset_monthly_lead_counts();

-- Create function to determine tier based on lead count (with search_path)
CREATE OR REPLACE FUNCTION get_tier_for_lead_count(lead_count INTEGER)
RETURNS TEXT 
LANGUAGE plpgsql 
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF lead_count < 10 THEN
    RETURN 'free';
  ELSIF lead_count >= 10 AND lead_count < 50 THEN
    RETURN 'pro';
  ELSE
    RETURN 'premium';
  END IF;
END;
$$;

-- Create function to reset monthly lead counts (with search_path)
CREATE OR REPLACE FUNCTION reset_monthly_lead_counts()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  UPDATE digger_profiles
  SET monthly_lead_count = 0,
      last_lead_count_reset = NOW()
  WHERE EXTRACT(DAY FROM NOW() AT TIME ZONE 'America/New_York') = EXTRACT(DAY FROM (DATE_TRUNC('month', NOW() AT TIME ZONE 'America/New_York') + INTERVAL '1 month - 1 day'));
END;
$$;