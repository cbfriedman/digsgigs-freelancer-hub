-- Store country/nationality from IP geolocation for display with flag in Signup Analytics
ALTER TABLE public.campaign_conversions
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS country_name text;

COMMENT ON COLUMN public.campaign_conversions.country_code IS 'ISO 3166-1 alpha-2 (e.g. US) from IP geolocation';
COMMENT ON COLUMN public.campaign_conversions.country_name IS 'Country name from IP geolocation';
