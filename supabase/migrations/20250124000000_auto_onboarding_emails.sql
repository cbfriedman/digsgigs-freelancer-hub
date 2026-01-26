-- Function to create onboarding email record when digger profile is created
-- The actual email will be sent by a scheduled edge function or webhook
CREATE OR REPLACE FUNCTION public.trigger_digger_onboarding_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Get user email and name from profiles
  SELECT p.email, p.full_name INTO user_email, user_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  
  -- Only proceed if we have an email
  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Create onboarding email record (this will be picked up by scheduled function)
  INSERT INTO public.digger_onboarding_emails (
    user_id,
    digger_profile_id,
    email,
    current_step,
    step_1_sent_at
  ) VALUES (
    NEW.user_id,
    NEW.id,
    user_email,
    1,
    NOW()
  ) ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to create onboarding email record: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to create onboarding record when digger profile is created
DROP TRIGGER IF EXISTS trigger_send_digger_onboarding_email ON public.digger_profiles;
CREATE TRIGGER trigger_send_digger_onboarding_email
  AFTER INSERT ON public.digger_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_digger_onboarding_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.trigger_digger_onboarding_email() TO authenticated;

-- Note: Consumer onboarding emails are triggered from the application code
-- when gigs are confirmed, as they require project links and status tracking
