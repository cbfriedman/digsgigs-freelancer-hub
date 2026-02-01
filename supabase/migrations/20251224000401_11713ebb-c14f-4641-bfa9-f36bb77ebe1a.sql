-- Ensure lead_number exists (may be missing if migration order differed on remote)
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS lead_number TEXT;
CREATE SEQUENCE IF NOT EXISTS lead_number_seq START WITH 1 INCREMENT BY 1;
CREATE OR REPLACE FUNCTION public.assign_lead_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN IF NEW.lead_number IS NULL THEN NEW.lead_number := TO_CHAR(NEW.created_at, 'YYYY-MM-DD') || '-' || LPAD(nextval('lead_number_seq')::TEXT, 5, '0'); END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS set_lead_number ON public.gigs;
CREATE TRIGGER set_lead_number BEFORE INSERT ON public.gigs FOR EACH ROW EXECUTE FUNCTION public.assign_lead_number();
UPDATE public.gigs SET lead_number = TO_CHAR(created_at, 'YYYY-MM-DD') || '-' || LPAD(id_seq::TEXT, 5, '0')
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as id_seq FROM public.gigs WHERE lead_number IS NULL) AS numbered WHERE gigs.id = numbered.id;
CREATE INDEX IF NOT EXISTS idx_gigs_lead_number ON public.gigs(lead_number);

-- Fix 1: Login Attempts Table - Remove OR true clause
DROP POLICY IF EXISTS "Users can read their own login attempts" ON login_attempts;
CREATE POLICY "Users can read their own login attempts" 
ON login_attempts 
FOR SELECT 
USING (identifier = auth.jwt()->>'email');

-- Fix 2: Profiles table - ensure only owner can view their own profile data
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view their own profile" 
ON profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Fix 3: Gigs table - hide consumer contact info from non-owners
-- Create a security definer function to check gig ownership
CREATE OR REPLACE FUNCTION public.is_gig_participant(gig_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gigs 
    WHERE id = gig_id 
    AND (
      consumer_id = auth.uid() 
      OR awarded_digger_id IN (SELECT dp.id FROM digger_profiles dp WHERE dp.user_id = auth.uid())
    )
  )
$$;

-- Create a safe view for gigs that hides contact info from non-participants
CREATE OR REPLACE VIEW public.safe_public_gigs AS
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