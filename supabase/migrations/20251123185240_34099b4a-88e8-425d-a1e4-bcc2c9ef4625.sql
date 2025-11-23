-- Make email column nullable in profiles table to support SMS-only signups
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- Update the handle_new_user function to handle both email and phone signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'consumer')
  );
  RETURN NEW;
END;
$$;