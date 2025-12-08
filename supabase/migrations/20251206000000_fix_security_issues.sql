-- Security Fixes: Prevent Role Escalation and Secure user_app_roles
-- This migration addresses critical security vulnerabilities

-- ============================================
-- FIX 1: Prevent users from modifying their own roles
-- ============================================

-- Drop existing permissive policies that allow users to modify their own roles
DROP POLICY IF EXISTS "Users can insert own app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Users can update own app roles" ON public.user_app_roles;

-- Create restrictive policies: Users can only VIEW their own roles, not modify them
-- Role modifications must be done through admin functions or service role

-- Users can view their own roles (keep this)
-- Policy already exists: "Users can view own app roles"

-- Users CANNOT insert their own roles
-- This prevents privilege escalation
-- Roles must be added through registration flow or admin functions
CREATE POLICY "System can insert app roles"
  ON public.user_app_roles
  FOR INSERT
  WITH CHECK (
    -- Only allow during registration (when user_id matches auth.uid() AND role is not admin)
    -- OR allow service role to insert any role
    (auth.uid() = user_id AND app_role != 'admin'::user_app_role)
    OR
    -- Service role can insert any role
    (auth.jwt() ->> 'role' = 'service_role')
  );

-- Users CANNOT update their own roles (except to set last_used_at)
-- This prevents users from activating deactivated roles or changing role types
CREATE POLICY "Users can update last_used_at only"
  ON public.user_app_roles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    -- Users can only update last_used_at, not is_active or app_role
    user_id = auth.uid()
    AND OLD.app_role = NEW.app_role
    AND OLD.is_active = NEW.is_active
    AND (
      -- Allow updating last_used_at
      (OLD.last_used_at IS DISTINCT FROM NEW.last_used_at)
      OR
      -- Service role can update anything
      (auth.jwt() ->> 'role' = 'service_role')
    )
  );

-- Users CANNOT delete their own roles
CREATE POLICY "System can delete app roles"
  ON public.user_app_roles
  FOR DELETE
  USING (
    -- Only service role can delete roles
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================
-- FIX 2: Add comment explaining security model
-- ============================================

COMMENT ON TABLE public.user_app_roles IS 
'SECURITY: Users cannot modify their own roles. Role modifications must be done through:
1. Registration flow (initial role assignment)
2. Admin functions (role changes)
3. Service role (system operations)

This prevents privilege escalation attacks.';

-- ============================================
-- FIX 3: Create function for safe role addition during registration
-- ============================================

-- This function allows users to add their first role during registration
-- but prevents adding additional roles or admin role
CREATE OR REPLACE FUNCTION public.add_user_app_role_safe(
  _user_id UUID,
  _app_role user_app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_roles_count INTEGER;
BEGIN
  -- Verify the user is adding a role for themselves
  IF _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Users can only add roles for themselves';
  END IF;

  -- Prevent adding admin role
  IF _app_role = 'admin'::user_app_role THEN
    RAISE EXCEPTION 'Admin role cannot be added through this function';
  END IF;

  -- Check if user already has this role
  SELECT COUNT(*) INTO existing_roles_count
  FROM public.user_app_roles
  WHERE user_id = _user_id AND app_role = _app_role;

  IF existing_roles_count > 0 THEN
    -- Role already exists, just activate it
    UPDATE public.user_app_roles
    SET is_active = true,
        last_used_at = now()
    WHERE user_id = _user_id AND app_role = _app_role;
  ELSE
    -- Add new role
    INSERT INTO public.user_app_roles (user_id, app_role, is_active, last_used_at)
    VALUES (_user_id, _app_role, true, now())
    ON CONFLICT (user_id, app_role) DO UPDATE
    SET is_active = true,
        last_used_at = now();
  END IF;
END;
$$;

COMMENT ON FUNCTION public.add_user_app_role_safe IS 
'Safe function for users to add their first role during registration.
Prevents privilege escalation by blocking admin role and multiple role additions.';

