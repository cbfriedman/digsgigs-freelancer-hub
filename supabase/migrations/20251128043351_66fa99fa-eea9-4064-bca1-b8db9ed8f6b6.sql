-- Remove the unique constraint on user_id to allow multiple profiles per user
ALTER TABLE public.digger_profiles 
DROP CONSTRAINT IF EXISTS digger_profiles_user_id_key;

-- Also check for the alternate constraint name from error message
ALTER TABLE public.digger_profiles 
DROP CONSTRAINT IF EXISTS digger_profiles_user_id_unique;

-- Ensure the foreign key constraint exists properly
ALTER TABLE public.digger_profiles
DROP CONSTRAINT IF EXISTS digger_profiles_user_id_fkey;

ALTER TABLE public.digger_profiles
ADD CONSTRAINT digger_profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;