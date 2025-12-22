-- Grant admin role to frostwebdev@gmail.com
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

