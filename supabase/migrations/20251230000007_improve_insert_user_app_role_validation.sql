-- Improve insert_user_app_role function to validate user exists and provide better error messages
-- This prevents foreign key constraint violations with clearer error messages

CREATE OR REPLACE FUNCTION public.insert_user_app_role(
  p_user_id UUID,
  p_app_role user_app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that user exists in auth.users before inserting
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User with id % does not exist in auth.users. Please ensure the user account is created before adding roles.', p_user_id
      USING ERRCODE = '23503';
  END IF;

  -- Insert role bypassing RLS completely
  INSERT INTO public.user_app_roles (user_id, app_role, is_active)
  VALUES (p_user_id, p_app_role, true)
  ON CONFLICT (user_id, app_role) 
  DO UPDATE SET 
    is_active = true,
    last_used_at = now();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_user_app_role(UUID, user_app_role) TO authenticated;

COMMENT ON FUNCTION public.insert_user_app_role IS 
'Insert user app role bypassing RLS. Validates that user exists in auth.users before inserting. Use this if direct INSERT causes recursion issues.';
