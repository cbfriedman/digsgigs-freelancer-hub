-- Add company_name, profile_number, and lead_tier_description to digger_profiles
ALTER TABLE public.digger_profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS profile_number INTEGER,
ADD COLUMN IF NOT EXISTS lead_tier_description TEXT;

-- Create a sequence for profile numbers
CREATE SEQUENCE IF NOT EXISTS profile_number_seq START WITH 1 INCREMENT BY 1;

-- Create a function to auto-assign profile numbers
CREATE OR REPLACE FUNCTION public.assign_profile_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_number IS NULL THEN
    NEW.profile_number := nextval('profile_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a trigger to auto-assign profile numbers on insert
DROP TRIGGER IF EXISTS trigger_assign_profile_number ON public.digger_profiles;
CREATE TRIGGER trigger_assign_profile_number
  BEFORE INSERT ON public.digger_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_profile_number();

-- Create an index on profile_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_digger_profiles_profile_number 
ON public.digger_profiles(profile_number);