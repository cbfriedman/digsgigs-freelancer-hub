-- Update digger_profiles to support multiple SIC and NAICS codes
ALTER TABLE digger_profiles 
  ALTER COLUMN sic_code TYPE text[] USING CASE WHEN sic_code IS NULL THEN '{}' ELSE ARRAY[sic_code] END,
  ALTER COLUMN naics_code TYPE text[] USING CASE WHEN naics_code IS NULL THEN '{}' ELSE ARRAY[naics_code] END;

-- Set default values for the arrays
ALTER TABLE digger_profiles 
  ALTER COLUMN sic_code SET DEFAULT '{}',
  ALTER COLUMN naics_code SET DEFAULT '{}';

-- Add indexes for better performance on array searches
CREATE INDEX IF NOT EXISTS idx_digger_profiles_sic_codes ON digger_profiles USING GIN(sic_code);
CREATE INDEX IF NOT EXISTS idx_digger_profiles_naics_codes ON digger_profiles USING GIN(naics_code);

-- Update the trigger function to work with arrays
CREATE OR REPLACE FUNCTION notify_matching_diggers_of_new_gig()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digger_record record;
  notification_count integer := 0;
BEGIN
  RAISE LOG 'notify_matching_diggers_of_new_gig triggered for gig: % (operation: %)', NEW.id, TG_OP;
  
  IF TG_OP = 'UPDATE' AND (OLD.ai_matched_codes = NEW.ai_matched_codes) THEN
    RAISE LOG 'Skipping notification - no new AI codes added';
    RETURN NEW;
  END IF;
  
  FOR digger_record IN
    SELECT DISTINCT dp.user_id, dp.business_name, dp.sic_code, dp.naics_code
    FROM digger_profiles dp
    WHERE (
      (NEW.category_id IS NOT NULL AND dp.id IN (
        SELECT digger_id FROM digger_categories dc 
        WHERE dc.category_id = NEW.category_id
      ))
      OR
      (NEW.sic_codes IS NOT NULL AND array_length(NEW.sic_codes, 1) > 0 AND 
       dp.sic_code && NEW.sic_codes)
      OR
      (NEW.naics_codes IS NOT NULL AND array_length(NEW.naics_codes, 1) > 0 AND 
       dp.naics_code && NEW.naics_codes)
    )
  LOOP
    PERFORM create_notification(
      digger_record.user_id,
      'new_gig',
      'New Gig Available',
      'A new gig matching your skills: "' || NEW.title || '"',
      '/browse-gigs',
      jsonb_build_object(
        'gig_id', NEW.id,
        'matched_sic', (dp.sic_code && NEW.sic_codes),
        'matched_naics', (dp.naics_code && NEW.naics_codes)
      )
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  RAISE LOG 'Sent % notifications for gig %', notification_count, NEW.id;
  RETURN NEW;
END;
$$;

-- Enable RLS on lead_issues table
ALTER TABLE lead_issues ENABLE ROW LEVEL SECURITY;