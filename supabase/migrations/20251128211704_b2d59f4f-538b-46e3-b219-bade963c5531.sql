-- Add location preference fields to digger_profiles table
ALTER TABLE digger_profiles 
ADD COLUMN IF NOT EXISTS service_zip_codes TEXT[],
ADD COLUMN IF NOT EXISTS service_radius_center TEXT,
ADD COLUMN IF NOT EXISTS service_radius_miles INTEGER;

COMMENT ON COLUMN digger_profiles.service_zip_codes IS 'Specific zip codes where digger wants to receive gigs';
COMMENT ON COLUMN digger_profiles.service_radius_center IS 'Center zip code for radius-based service area';
COMMENT ON COLUMN digger_profiles.service_radius_miles IS 'Radius in miles from center zip code';