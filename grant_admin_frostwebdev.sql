-- Grant admin role to frostwebdev@gmail.com
-- Run this SQL directly in Supabase SQL Editor if migration hasn't been applied yet

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

-- Also grant admin role in user_roles (old system for backward compatibility)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  'admin'::app_role
FROM public.profiles p
WHERE p.email = 'frostwebdev@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the admin role was granted
SELECT 
  p.email,
  p.full_name,
  uar.app_role as app_role,
  ur.role as legacy_role
FROM public.profiles p
LEFT JOIN public.user_app_roles uar ON uar.user_id = p.id AND uar.app_role = 'admin' AND uar.is_active = true
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
WHERE p.email = 'frostwebdev@gmail.com';

