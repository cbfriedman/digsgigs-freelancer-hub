-- Ensure admin role is granted to frostwebdev@gmail.com
-- Uses SECURITY DEFINER function to bypass RLS
-- This migration is idempotent and safe to run multiple times

-- Create a SECURITY DEFINER function to grant admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.grant_admin_role_by_email(p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email from auth.users (more reliable than profiles)
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  -- If not found in auth.users, try profiles table
  IF target_user_id IS NULL THEN
    SELECT id INTO target_user_id
    FROM public.profiles
    WHERE email = p_email
    LIMIT 1;
  END IF;
  
  -- If user found, grant admin role
  IF target_user_id IS NOT NULL THEN
    -- Insert admin role in user_app_roles (new system)
    INSERT INTO public.user_app_roles (user_id, app_role, is_active, last_used_at)
    VALUES (target_user_id, 'admin'::user_app_role, true, now())
    ON CONFLICT (user_id, app_role) 
    DO UPDATE SET 
      is_active = true,
      last_used_at = now();
    
    -- Also insert in user_roles (old system for backward compatibility)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to % (user_id: %)', p_email, target_user_id;
  ELSE
    RAISE WARNING 'User with email % not found. Please ensure the user has signed up first.', p_email;
  END IF;
END;
$$;

-- Grant admin role to frostwebdev@gmail.com
SELECT public.grant_admin_role_by_email('frostwebdev@gmail.com');

-- Alternative method: Direct insert using service role context
-- This ensures the role is granted even if RLS is blocking
INSERT INTO public.user_app_roles (user_id, app_role, is_active, last_used_at)
SELECT 
  COALESCE(
    (SELECT id FROM auth.users WHERE email = 'frostwebdev@gmail.com' LIMIT 1),
    (SELECT id FROM public.profiles WHERE email = 'frostwebdev@gmail.com' LIMIT 1)
  ),
  'admin'::user_app_role,
  true,
  now()
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'frostwebdev@gmail.com'
  UNION
  SELECT 1 FROM public.profiles WHERE email = 'frostwebdev@gmail.com'
)
ON CONFLICT (user_id, app_role) 
DO UPDATE SET 
  is_active = true,
  last_used_at = now();

-- Also ensure admin role in user_roles table (old system)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  COALESCE(
    (SELECT id FROM auth.users WHERE email = 'frostwebdev@gmail.com' LIMIT 1),
    (SELECT id FROM public.profiles WHERE email = 'frostwebdev@gmail.com' LIMIT 1)
  ),
  'admin'::app_role
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'frostwebdev@gmail.com'
  UNION
  SELECT 1 FROM public.profiles WHERE email = 'frostwebdev@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
