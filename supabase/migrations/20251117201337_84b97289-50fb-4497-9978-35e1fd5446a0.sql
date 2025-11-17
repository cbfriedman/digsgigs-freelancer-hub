-- Add keywords field for semantic matching
ALTER TABLE digger_profiles 
ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';

COMMENT ON COLUMN digger_profiles.keywords IS 'User-defined keywords for semantic matching (comma/semicolon separated by user)';

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_digger_profiles_keywords ON digger_profiles USING GIN(keywords);

-- Remove dependency on industry codes for matching by dropping the old matching function
-- We'll keep the codes columns for now but they won't be used for matching
DROP TRIGGER IF EXISTS notify_matching_diggers ON gigs;
DROP FUNCTION IF EXISTS notify_matching_diggers_of_new_gig();