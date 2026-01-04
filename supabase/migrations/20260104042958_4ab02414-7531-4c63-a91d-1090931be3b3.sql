-- Drop existing functions if they exist (to allow return type changes)
DROP FUNCTION IF EXISTS public.get_user_app_roles_safe(uuid);
DROP FUNCTION IF EXISTS public.insert_user_app_role(uuid, text);
DROP FUNCTION IF EXISTS public.insert_user_app_role(uuid, user_app_role);

-- Create function to safely get user app roles (bypasses RLS)
-- Returns text instead of enum for better compatibility
CREATE FUNCTION public.get_user_app_roles_safe(_user_id uuid)
RETURNS TABLE(app_role text, is_active boolean, last_used_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_role::text, is_active, last_used_at
  FROM public.user_app_roles
  WHERE user_id = _user_id 
    AND is_active = true
  ORDER BY last_used_at DESC NULLS LAST, created_at ASC
$$;

-- Create function to insert user app role (bypasses RLS)
-- Accepts text and converts to enum type
CREATE FUNCTION public.insert_user_app_role(p_user_id uuid, p_app_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_app_roles (user_id, app_role, is_active)
  VALUES (p_user_id, p_app_role::user_app_role, true)
  ON CONFLICT (user_id, app_role) DO NOTHING;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_app_roles_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_app_role(uuid, text) TO authenticated;