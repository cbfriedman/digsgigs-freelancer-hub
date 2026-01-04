-- Grant admin role to frostwebdev@gmail.com
-- Run this SQL directly in Supabase SQL Editor

-- Grant admin role in user_app_roles (new system)
INSERT INTO public.user_app_roles (user_id, app_role, is_active, last_used_at)
SELECT 
  p.id,
  'admin'::user_app_role,
  true,
  now()
FROM public.profiles p
WHERE p.email = 'frostwebdev@gmail.com'
ON CONFLICT (user_id, app_role) 
DO UPDATE SET 
  is_active = true,
  last_used_at = now();

-- Verify the admin role was granted
SELECT 
  p.email,
  p.full_name,
  uar.app_role as app_role,
  uar.is_active,
  uar.last_used_at
FROM public.profiles p
LEFT JOIN public.user_app_roles uar ON uar.user_id = p.id AND uar.app_role = 'admin'
WHERE p.email = 'frostwebdev@gmail.com';
