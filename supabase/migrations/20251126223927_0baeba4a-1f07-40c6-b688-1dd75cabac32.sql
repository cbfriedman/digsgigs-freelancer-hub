-- Drop the auto-role-assignment trigger that converts consumer -> gigger
DROP TRIGGER IF EXISTS trigger_sync_user_type_to_app_roles ON public.profiles;

-- Update handle_new_user function to not default to 'consumer'
-- This prevents automatic role assignment and allows user selection in the UI
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL  -- Changed from 'consumer' to NULL, allowing role selection in UI
  );
  RETURN NEW;
END;
$$;