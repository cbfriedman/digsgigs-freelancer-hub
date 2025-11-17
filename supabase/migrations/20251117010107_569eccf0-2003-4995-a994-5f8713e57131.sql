-- Add pricing model field to digger_profiles
ALTER TABLE digger_profiles 
ADD COLUMN pricing_model text CHECK (pricing_model IN ('commission', 'hourly', 'both')) DEFAULT 'both';

COMMENT ON COLUMN digger_profiles.pricing_model IS 'Pricing model preference: commission (fixed price projects), hourly (hourly rate work), or both (for construction/trades)';