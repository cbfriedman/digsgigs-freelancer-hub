-- Grant admin role to frostwebdev@gmail.com
-- This ensures admin role is granted in both user_app_roles (new system) and user_roles (old system)

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email from profiles table
  SELECT id INTO target_user_id
  FROM public.profiles
  WHERE email = 'frostwebdev@gmail.com'
  LIMIT 1;
  
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
    
    RAISE NOTICE 'Admin role granted to frostwebdev@gmail.com (user_id: %)', target_user_id;
  ELSE
    RAISE WARNING 'User with email frostwebdev@gmail.com not found in profiles table. Please ensure the user has signed up first.';
  END IF;
END $$;

-- Grant admin role to coby@cfcontracting.com
INSERT INTO public.user_app_roles (user_id, app_role, is_active, last_used_at)
SELECT 
  p.id,
  'admin'::user_app_role,
  true,
  now()
FROM public.profiles p
WHERE p.email = 'coby@cfcontracting.com'
ON CONFLICT (user_id, app_role) 
DO UPDATE SET 
  is_active = true,
  last_used_at = now();

