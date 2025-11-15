-- Add fields to store custom SIC/NAICS codes for digger profiles
ALTER TABLE digger_profiles 
ADD COLUMN sic_code text,
ADD COLUMN naics_code text,
ADD COLUMN custom_occupation_title text;

-- Add comments
COMMENT ON COLUMN digger_profiles.sic_code IS 'Standard Industrial Classification code for Other professions';
COMMENT ON COLUMN digger_profiles.naics_code IS 'North American Industry Classification System code';
COMMENT ON COLUMN digger_profiles.custom_occupation_title IS 'Custom occupation title when using SIC/NAICS codes';

-- Create a table for common SIC/NAICS codes lookup
CREATE TABLE industry_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_type text NOT NULL CHECK (code_type IN ('SIC', 'NAICS')),
  code text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(code_type, code)
);

-- Enable RLS
ALTER TABLE industry_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can view codes
CREATE POLICY "Anyone can view industry codes"
ON industry_codes FOR SELECT
TO public
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_industry_codes_code ON industry_codes(code_type, code);
CREATE INDEX idx_industry_codes_search ON industry_codes USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));