-- Assign admin role to user
INSERT INTO public.user_app_roles (user_id, app_role, is_active, last_used_at)
VALUES (
  '5743bb26-d261-4995-ac54-5eb51bd2c55f',
  'admin',
  true,
  now()
)
ON CONFLICT (user_id, app_role) 
DO UPDATE SET 
  is_active = true,
  last_used_at = now();