-- Add giveaway eligibility tracking fields to digger_profiles
ALTER TABLE public.digger_profiles 
  ADD COLUMN IF NOT EXISTS is_giveaway_eligible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS giveaway_qualified_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_digger_profiles_giveaway_eligible 
  ON public.digger_profiles(is_giveaway_eligible, giveaway_qualified_at);

-- Function to check if a digger is eligible for the giveaway
-- Eligibility criteria:
-- 1. Email verified (auth.users.email_confirmed_at is not null)
-- 2. Profile complete (required fields filled)
-- 3. Categories/professions selected (at least one profession assignment)
-- 4. Profile photo uploaded (profile_image_url is not null)
-- 5. Admin approval completed (verified = true)
CREATE OR REPLACE FUNCTION public.check_giveaway_eligibility(_digger_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _email_verified BOOLEAN;
  _profile_complete BOOLEAN;
  _has_professions BOOLEAN;
  _has_photo BOOLEAN;
  _is_verified BOOLEAN;
  _profile_record RECORD;
BEGIN
  -- Get the user_id from digger_profile
  SELECT user_id INTO _user_id
  FROM public.digger_profiles
  WHERE id = _digger_profile_id;
  
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get profile data
  SELECT * INTO _profile_record
  FROM public.digger_profiles
  WHERE id = _digger_profile_id;
  
  -- 1. Check email verification
  SELECT (email_confirmed_at IS NOT NULL) INTO _email_verified
  FROM auth.users
  WHERE id = _user_id;
  
  -- If user not found in auth.users, set to false
  IF NOT FOUND THEN
    _email_verified := false;
  END IF;
  
  -- Ensure boolean (not NULL)
  _email_verified := COALESCE(_email_verified, false);
  
  -- 2. Check profile completeness (required fields)
  _profile_complete := (
    _profile_record.business_name IS NOT NULL AND _profile_record.business_name != '' AND
    _profile_record.phone IS NOT NULL AND _profile_record.phone != '' AND
    _profile_record.location IS NOT NULL AND _profile_record.location != '' AND
    _profile_record.bio IS NOT NULL AND _profile_record.bio != ''
  );
  
  -- 3. Check if categories/professions are selected
  SELECT EXISTS (
    SELECT 1 
    FROM public.digger_profession_assignments
    WHERE digger_profile_id = _digger_profile_id
  ) INTO _has_professions;
  
  -- If no profession assignments, check old digger_categories table as fallback
  IF NOT _has_professions THEN
    SELECT EXISTS (
      SELECT 1 
      FROM public.digger_categories
      WHERE digger_id = _digger_profile_id
    ) INTO _has_professions;
  END IF;
  
  -- 4. Check if profile photo is uploaded
  _has_photo := (_profile_record.profile_image_url IS NOT NULL AND _profile_record.profile_image_url != '');
  
  -- 5. Check admin approval (verified field)
  _is_verified := COALESCE(_profile_record.verified, false);
  
  -- All criteria must be met
  RETURN _email_verified AND _profile_complete AND _has_professions AND _has_photo AND _is_verified;
END;
$$;

-- Function to update giveaway eligibility for a digger profile
CREATE OR REPLACE FUNCTION public.update_giveaway_eligibility(_digger_profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_eligible BOOLEAN;
  _currently_eligible BOOLEAN;
BEGIN
  -- Check eligibility
  _is_eligible := public.check_giveaway_eligibility(_digger_profile_id);
  
  -- Get current status
  SELECT is_giveaway_eligible INTO _currently_eligible
  FROM public.digger_profiles
  WHERE id = _digger_profile_id;
  
  -- Update if eligibility changed
  IF _is_eligible AND NOT COALESCE(_currently_eligible, false) THEN
    -- Just became eligible - set timestamp
    UPDATE public.digger_profiles
    SET 
      is_giveaway_eligible = true,
      giveaway_qualified_at = now()
    WHERE id = _digger_profile_id;
  ELSIF NOT _is_eligible AND COALESCE(_currently_eligible, false) THEN
    -- No longer eligible - clear status
    UPDATE public.digger_profiles
    SET 
      is_giveaway_eligible = false,
      giveaway_qualified_at = NULL
    WHERE id = _digger_profile_id;
  END IF;
END;
$$;

-- Trigger function to automatically check eligibility when digger profile is updated
CREATE OR REPLACE FUNCTION public.trigger_update_giveaway_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_giveaway_eligibility(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on digger_profiles
DROP TRIGGER IF EXISTS check_giveaway_eligibility_trigger ON public.digger_profiles;
CREATE TRIGGER check_giveaway_eligibility_trigger
  AFTER INSERT OR UPDATE ON public.digger_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_giveaway_eligibility();

-- Trigger for profession assignments (when categories are added/removed)
CREATE OR REPLACE FUNCTION public.trigger_update_giveaway_on_profession_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_giveaway_eligibility(NEW.digger_profile_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_giveaway_eligibility(OLD.digger_profile_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on digger_profession_assignments
DROP TRIGGER IF EXISTS check_giveaway_on_profession_assign_trigger ON public.digger_profession_assignments;
CREATE TRIGGER check_giveaway_on_profession_assign_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.digger_profession_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_giveaway_on_profession_change();

-- Trigger for old digger_categories table (fallback)
CREATE OR REPLACE FUNCTION public.trigger_update_giveaway_on_category_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_giveaway_eligibility(NEW.digger_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_giveaway_eligibility(OLD.digger_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on digger_categories (if still in use)
DROP TRIGGER IF EXISTS check_giveaway_on_category_trigger ON public.digger_categories;
CREATE TRIGGER check_giveaway_on_category_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.digger_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_giveaway_on_category_change();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_giveaway_eligibility(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_giveaway_eligibility(UUID) TO authenticated;

-- Update existing profiles to check eligibility
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id FROM public.digger_profiles
  LOOP
    PERFORM public.update_giveaway_eligibility(profile_record.id);
  END LOOP;
END $$;
