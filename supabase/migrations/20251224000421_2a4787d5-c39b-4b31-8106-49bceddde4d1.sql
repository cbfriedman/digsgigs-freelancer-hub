-- Drop the security definer view and use a regular view with SECURITY INVOKER
DROP VIEW IF EXISTS public.safe_public_gigs;

-- Create a regular view that respects the caller's permissions
CREATE VIEW public.safe_public_gigs 
WITH (security_invoker = true)
AS
SELECT 
  id,
  title,
  description,
  location,
  location_lat,
  location_lng,
  budget_min,
  budget_max,
  deadline,
  timeline,
  status,
  category_id,
  created_at,
  updated_at,
  consumer_id,
  awarded_digger_id,
  awarded_bid_id,
  awarded_at,
  images,
  documents,
  naics_codes,
  sic_codes,
  ai_matched_codes,
  is_confirmed_lead,
  confirmation_status,
  confirmation_sent_at,
  confirmed_at,
  lead_number,
  lead_source,
  purchase_count,
  contact_preferences,
  escrow_requested_by_consumer,
  confirmation_method_preference,
  uploaded_by_telemarketer,
  telemarketer_id,
  -- Only show contact info to gig owner or awarded digger
  CASE 
    WHEN consumer_id = auth.uid() 
    OR awarded_digger_id IN (SELECT dp.id FROM digger_profiles dp WHERE dp.user_id = auth.uid())
    THEN consumer_email 
    ELSE NULL 
  END as consumer_email,
  CASE 
    WHEN consumer_id = auth.uid() 
    OR awarded_digger_id IN (SELECT dp.id FROM digger_profiles dp WHERE dp.user_id = auth.uid())
    THEN consumer_phone 
    ELSE NULL 
  END as consumer_phone
FROM gigs;