-- Additional helper functions for testing and manual eligibility updates

-- Function to manually trigger eligibility check for a specific digger
-- Useful for testing or manual updates
CREATE OR REPLACE FUNCTION public.manual_check_giveaway_eligibility(_digger_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSON;
  _is_eligible BOOLEAN;
  _checks JSON;
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
    RETURN json_build_object(
      'success', false,
      'error', 'Digger profile not found',
      'digger_profile_id', _digger_profile_id
    );
  END IF;
  
  -- Get profile data
  SELECT * INTO _profile_record
  FROM public.digger_profiles
  WHERE id = _digger_profile_id;
  
  -- 1. Check email verification
  SELECT (email_confirmed_at IS NOT NULL) INTO _email_verified
  FROM auth.users
  WHERE id = _user_id;
  
  IF NOT FOUND THEN
    _email_verified := false;
  END IF;
  _email_verified := COALESCE(_email_verified, false);
  
  -- 2. Check profile completeness
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
  
  -- 5. Check admin approval
  _is_verified := COALESCE(_profile_record.verified, false);
  
  -- Build checks object
  _checks := json_build_object(
    'email_verified', _email_verified,
    'profile_complete', _profile_complete,
    'has_professions', _has_professions,
    'has_photo', _has_photo,
    'is_verified', _is_verified
  );
  
  -- Calculate overall eligibility
  _is_eligible := _email_verified AND _profile_complete AND _has_professions AND _has_photo AND _is_verified;
  
  -- Update eligibility
  PERFORM public.update_giveaway_eligibility(_digger_profile_id);
  
  -- Get current status
  SELECT is_giveaway_eligible, giveaway_qualified_at INTO _is_eligible, _result
  FROM public.digger_profiles
  WHERE id = _digger_profile_id;
  
  -- Return detailed result
  RETURN json_build_object(
    'success', true,
    'digger_profile_id', _digger_profile_id,
    'user_id', _user_id,
    'is_eligible', COALESCE(_is_eligible, false),
    'giveaway_qualified_at', (SELECT giveaway_qualified_at FROM public.digger_profiles WHERE id = _digger_profile_id),
    'checks', _checks,
    'missing_requirements', json_build_array(
      CASE WHEN NOT _email_verified THEN 'email_verified' END,
      CASE WHEN NOT _profile_complete THEN 'profile_complete' END,
      CASE WHEN NOT _has_professions THEN 'has_professions' END,
      CASE WHEN NOT _has_photo THEN 'has_photo' END,
      CASE WHEN NOT _is_verified THEN 'is_verified' END
    )
  );
END;
$$;

-- Function to get giveaway statistics
CREATE OR REPLACE FUNCTION public.get_giveaway_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total_eligible INTEGER;
  _total_diggers INTEGER;
  _goal_progress NUMERIC;
  _recent_qualifications INTEGER;
BEGIN
  -- Count eligible diggers
  SELECT COUNT(*) INTO _total_eligible
  FROM public.digger_profiles
  WHERE is_giveaway_eligible = true;
  
  -- Count total diggers
  SELECT COUNT(*) INTO _total_diggers
  FROM public.digger_profiles;
  
  -- Calculate goal progress (500 is the goal)
  _goal_progress := ROUND((_total_eligible::NUMERIC / 500.0) * 100, 2);
  
  -- Count recent qualifications (last 7 days)
  SELECT COUNT(*) INTO _recent_qualifications
  FROM public.digger_profiles
  WHERE is_giveaway_eligible = true
    AND giveaway_qualified_at >= NOW() - INTERVAL '7 days';
  
  RETURN json_build_object(
    'total_eligible', _total_eligible,
    'total_diggers', _total_diggers,
    'goal_progress_percent', _goal_progress,
    'remaining_until_goal', GREATEST(0, 500 - _total_eligible),
    'recent_qualifications_7d', _recent_qualifications,
    'goal_reached', _total_eligible >= 500
  );
END;
$$;

-- Function to recheck all digger profiles (useful for bulk updates)
CREATE OR REPLACE FUNCTION public.recheck_all_giveaway_eligibility()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_record RECORD;
  _checked_count INTEGER := 0;
  _eligible_count INTEGER := 0;
  _errors INTEGER := 0;
BEGIN
  FOR _profile_record IN SELECT id FROM public.digger_profiles
  LOOP
    BEGIN
      PERFORM public.update_giveaway_eligibility(_profile_record.id);
      _checked_count := _checked_count + 1;
      
      -- Count how many are eligible
      IF EXISTS (
        SELECT 1 FROM public.digger_profiles 
        WHERE id = _profile_record.id AND is_giveaway_eligible = true
      ) THEN
        _eligible_count := _eligible_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      _errors := _errors + 1;
      -- Log error but continue processing
      RAISE WARNING 'Error checking eligibility for digger profile %: %', _profile_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'checked_count', _checked_count,
    'eligible_count', _eligible_count,
    'errors', _errors
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.manual_check_giveaway_eligibility(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_giveaway_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recheck_all_giveaway_eligibility() TO authenticated;

-- Add error handling to the main eligibility check function
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
  BEGIN
    SELECT * INTO _profile_record
    FROM public.digger_profiles
    WHERE id = _digger_profile_id;
  EXCEPTION WHEN OTHERS THEN
    -- If we can't get the profile, return false
    RETURN false;
  END;
  
  -- 1. Check email verification
  BEGIN
    SELECT (email_confirmed_at IS NOT NULL) INTO _email_verified
    FROM auth.users
    WHERE id = _user_id;
    
    IF NOT FOUND THEN
      _email_verified := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If we can't check email verification, assume false
    _email_verified := false;
  END;
  
  _email_verified := COALESCE(_email_verified, false);
  
  -- 2. Check profile completeness (required fields)
  _profile_complete := (
    _profile_record.business_name IS NOT NULL AND _profile_record.business_name != '' AND
    _profile_record.phone IS NOT NULL AND _profile_record.phone != '' AND
    _profile_record.location IS NOT NULL AND _profile_record.location != '' AND
    _profile_record.bio IS NOT NULL AND _profile_record.bio != ''
  );
  
  -- 3. Check if categories/professions are selected
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- If we can't check professions, assume false
    _has_professions := false;
  END;
  
  _has_professions := COALESCE(_has_professions, false);
  
  -- 4. Check if profile photo is uploaded
  _has_photo := (_profile_record.profile_image_url IS NOT NULL AND _profile_record.profile_image_url != '');
  
  -- 5. Check admin approval (verified field)
  _is_verified := COALESCE(_profile_record.verified, false);
  
  -- All criteria must be met
  RETURN _email_verified AND _profile_complete AND _has_professions AND _has_photo AND _is_verified;
END;
$$;
