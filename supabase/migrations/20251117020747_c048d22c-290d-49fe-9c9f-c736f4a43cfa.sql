-- Update the notify_matching_diggers_of_new_gig function to handle both INSERT and UPDATE
-- This ensures notifications are sent when AI codes are added via UPDATE
CREATE OR REPLACE FUNCTION public.notify_matching_diggers_of_new_gig()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  digger_record record;
  notification_count integer := 0;
BEGIN
  -- Log the trigger execution
  RAISE LOG 'notify_matching_diggers_of_new_gig triggered for gig: % (operation: %)', NEW.id, TG_OP;
  
  -- For UPDATE operations, only proceed if AI codes were just added
  IF TG_OP = 'UPDATE' AND (OLD.ai_matched_codes = NEW.ai_matched_codes) THEN
    RAISE LOG 'Skipping notification - no new AI codes added';
    RETURN NEW;
  END IF;
  
  -- Find diggers with matching categories OR matching industry codes
  FOR digger_record IN
    SELECT DISTINCT dp.user_id, dp.business_name, dp.sic_code, dp.naics_code
    FROM public.digger_profiles dp
    WHERE (
      -- Match by category if gig has one
      (NEW.category_id IS NOT NULL AND dp.id IN (
        SELECT digger_id FROM public.digger_categories dc 
        WHERE dc.category_id = NEW.category_id
      ))
      OR
      -- Match by SIC codes
      (NEW.sic_codes IS NOT NULL AND array_length(NEW.sic_codes, 1) > 0 AND 
       dp.sic_code = ANY(NEW.sic_codes))
      OR
      -- Match by NAICS codes
      (NEW.naics_codes IS NOT NULL AND array_length(NEW.naics_codes, 1) > 0 AND 
       dp.naics_code = ANY(NEW.naics_codes))
    )
  LOOP
    -- Create notification for each matching digger
    PERFORM public.create_notification(
      digger_record.user_id,
      'new_gig',
      'New Gig Available',
      'A new gig matching your skills: "' || NEW.title || '"',
      '/browse-gigs',
      jsonb_build_object(
        'gig_id', NEW.id,
        'matched_sic', (digger_record.sic_code = ANY(NEW.sic_codes)),
        'matched_naics', (digger_record.naics_code = ANY(NEW.naics_codes))
      )
    );
    
    notification_count := notification_count + 1;
    
    RAISE LOG 'Notified digger % (%) - SIC: %, NAICS: %', 
      digger_record.business_name, 
      digger_record.user_id,
      digger_record.sic_code,
      digger_record.naics_code;
  END LOOP;
  
  RAISE LOG 'Sent % notifications for gig %', notification_count, NEW.id;
  
  RETURN NEW;
END;
$function$;

-- Drop the existing INSERT-only trigger
DROP TRIGGER IF EXISTS notify_matching_diggers ON public.gigs;

-- Create trigger that fires on both INSERT and UPDATE
CREATE TRIGGER notify_matching_diggers
AFTER INSERT OR UPDATE OF sic_codes, naics_codes, ai_matched_codes ON public.gigs
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_diggers_of_new_gig();