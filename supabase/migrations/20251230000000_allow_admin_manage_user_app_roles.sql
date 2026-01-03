-- Allow admins to manage user_app_roles for other users
-- This fixes the RLS policy issue preventing admins from adding/removing roles

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Admins can manage all app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Admins can insert app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Admins can update app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Admins can delete app roles" ON public.user_app_roles;

-- Policy: Admins can view all app roles
CREATE POLICY "Admins can view all app roles"
  ON public.user_app_roles
  FOR SELECT
  USING (
    -- Check if current user has admin role in user_app_roles
    EXISTS (
      SELECT 1
      FROM public.user_app_roles
      WHERE user_id = auth.uid()
        AND app_role = 'admin'::user_app_role
        AND is_active = true
    )
    OR
    -- Service role can view everything
    (auth.jwt() ->> 'role' = 'service_role')
    OR
    -- Users can view their own roles
    (user_id = auth.uid())
  );

-- Policy: Admins can insert app roles for any user
CREATE POLICY "Admins can insert app roles"
  ON public.user_app_roles
  FOR INSERT
  WITH CHECK (
    -- Service role can insert any role
    (auth.jwt() ->> 'role' = 'service_role')
    OR
    -- Admins can insert roles for any user
    EXISTS (
      SELECT 1
      FROM public.user_app_roles
      WHERE user_id = auth.uid()
        AND app_role = 'admin'::user_app_role
        AND is_active = true
    )
    OR
    -- Users can insert their own roles (but not admin)
    (auth.uid() = user_id AND app_role != 'admin'::user_app_role)
  );

-- Policy: Admins can update app roles for any user
CREATE POLICY "Admins can update app roles"
  ON public.user_app_roles
  FOR UPDATE
  USING (
    -- Service role can update anything
    (auth.jwt() ->> 'role' = 'service_role')
    OR
    -- Admins can update roles for any user
    EXISTS (
      SELECT 1
      FROM public.user_app_roles
      WHERE user_id = auth.uid()
        AND app_role = 'admin'::user_app_role
        AND is_active = true
    )
    OR
    -- Users can update their own roles (restricted by trigger)
    (user_id = auth.uid())
  )
  WITH CHECK (
    -- Service role can update anything
    (auth.jwt() ->> 'role' = 'service_role')
    OR
    -- Admins can update roles for any user
    EXISTS (
      SELECT 1
      FROM public.user_app_roles
      WHERE user_id = auth.uid()
        AND app_role = 'admin'::user_app_role
        AND is_active = true
    )
    OR
    -- Users can update their own roles (restricted by trigger)
    (user_id = auth.uid())
  );

-- Policy: Admins can delete app roles for any user
CREATE POLICY "Admins can delete app roles"
  ON public.user_app_roles
  FOR DELETE
  USING (
    -- Service role can delete anything
    (auth.jwt() ->> 'role' = 'service_role')
    OR
    -- Admins can delete roles for any user
    EXISTS (
      SELECT 1
      FROM public.user_app_roles
      WHERE user_id = auth.uid()
        AND app_role = 'admin'::user_app_role
        AND is_active = true
    )
  );

COMMENT ON POLICY "Admins can view all app roles" ON public.user_app_roles IS 
'Allows users with admin role in user_app_roles to view all user roles. 
Also allows service role and users to view their own roles.';

COMMENT ON POLICY "Admins can insert app roles" ON public.user_app_roles IS 
'Allows admins to insert roles for any user. Also allows users to insert their own roles (except admin).';

COMMENT ON POLICY "Admins can update app roles" ON public.user_app_roles IS 
'Allows admins to update roles for any user. Regular users can only update their own roles (restricted by trigger).';

COMMENT ON POLICY "Admins can delete app roles" ON public.user_app_roles IS 
'Allows admins and service role to delete roles for any user.';
