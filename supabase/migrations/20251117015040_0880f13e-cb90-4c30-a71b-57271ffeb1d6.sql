-- Add industry code fields to gigs table
ALTER TABLE public.gigs
ADD COLUMN sic_codes text[] DEFAULT '{}',
ADD COLUMN naics_codes text[] DEFAULT '{}',
ADD COLUMN ai_matched_codes boolean DEFAULT false;

COMMENT ON COLUMN public.gigs.sic_codes IS 'AI-matched SIC codes based on gig description';
COMMENT ON COLUMN public.gigs.naics_codes IS 'AI-matched NAICS codes based on gig description';
COMMENT ON COLUMN public.gigs.ai_matched_codes IS 'Whether codes were matched by AI';

-- Update the notify_matching_diggers_of_new_gig function to also check industry codes
CREATE OR REPLACE FUNCTION public.notify_matching_diggers_of_new_gig()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  digger_record record;
BEGIN
  -- Find diggers with matching categories OR matching industry codes
  FOR digger_record IN
    SELECT DISTINCT dp.user_id
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
      jsonb_build_object('gig_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;