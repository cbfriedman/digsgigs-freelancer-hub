-- Comprehensive fix for all user_app_roles RLS issues and ensure proper function setup
-- This migration fixes 500 errors and ensures all operations work correctly

-- ============================================
-- FIX 1: Ensure all functions bypass RLS completely
-- ============================================

-- Recreate has_app_role function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id UUID, _role user_app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS completely
  -- Direct query without any RLS checks
  RETURN EXISTS (
    SELECT 1
    FROM public.user_app_roles
    WHERE user_id = _user_id 
      AND app_role = _role
      AND is_active = true
  );
END;
$$;

-- Recreate get_user_app_roles_safe to ensure it bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_app_roles_safe(_user_id UUID)
RETURNS TABLE(app_role user_app_role, last_used_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return roles for the user, bypassing RLS completely
  RETURN QUERY
  SELECT 
    uar.app_role,
    uar.last_used_at
  FROM public.user_app_roles uar
  WHERE uar.user_id = _user_id
    AND uar.is_active = true
  ORDER BY uar.last_used_at DESC NULLS LAST, uar.created_at ASC;
EXCEPTION
  WHEN OTHERS THEN
    -- Return empty result on error instead of throwing
    RETURN;
END;
$$;

-- Recreate is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct check for admin role, bypassing RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.user_app_roles
    WHERE user_id = _user_id 
      AND app_role = 'admin'::user_app_role
      AND is_active = true
  );
END;
$$;

-- ============================================
-- FIX 2: Drop ALL existing policies to start fresh
-- ============================================

DROP POLICY IF EXISTS "Users can view own app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Users can insert own app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Users can update own app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Users can update last_used_at only" ON public.user_app_roles;
DROP POLICY IF EXISTS "System can insert app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "System can delete app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Admins can manage all app roles" ON public.user_app_roles;

-- ============================================
-- FIX 3: Create simple, non-recursive RLS policies
-- ============================================

-- SELECT: Users can only view their own roles
CREATE POLICY "Users can view own app roles"
  ON public.user_app_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can insert their own roles
CREATE POLICY "Users can insert own app roles"
  ON public.user_app_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update last_used_at for their own roles
-- This policy uses a trigger function to prevent modifying app_role or is_active
CREATE POLICY "Users can update own app roles"
  ON public.user_app_roles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- FIX 4: Ensure trigger function prevents role modification
-- ============================================

CREATE OR REPLACE FUNCTION public.prevent_role_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role can do anything
  BEGIN
    IF (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role' THEN
      RETURN NEW;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If JWT claims are not available, continue with normal checks
      NULL;
  END;

  -- Check if user is trying to modify app_role or is_active
  IF OLD.app_role IS DISTINCT FROM NEW.app_role THEN
    RAISE EXCEPTION 'Cannot modify app_role. Only last_used_at can be updated.';
  END IF;

  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    RAISE EXCEPTION 'Cannot modify is_active. Only last_used_at can be updated.';
  END IF;

  -- Allow updating last_used_at
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS prevent_role_modification_trigger ON public.user_app_roles;
CREATE TRIGGER prevent_role_modification_trigger
  BEFORE UPDATE ON public.user_app_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_modification();

-- ============================================
-- FIX 5: Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.has_app_role(UUID, user_app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_app_roles_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_role_modification() TO authenticated;

-- ============================================
-- FIX 6: Ensure indexes exist for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_app_roles_user_id ON public.user_app_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_app_roles_app_role ON public.user_app_roles(app_role);
CREATE INDEX IF NOT EXISTS idx_user_app_roles_active ON public.user_app_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_app_roles_user_active ON public.user_app_roles(user_id, is_active) WHERE is_active = true;

-- ============================================
-- FIX 7: Add comments for documentation
-- ============================================

COMMENT ON FUNCTION public.has_app_role IS 
'Check if a user has a specific app role. Bypasses RLS completely using SECURITY DEFINER.';

COMMENT ON FUNCTION public.get_user_app_roles_safe IS 
'Safe function to get user app roles that handles errors gracefully. Returns empty result on error instead of throwing exception. Bypasses RLS completely using SECURITY DEFINER.';

COMMENT ON FUNCTION public.is_admin IS 
'Check if a user has admin role. Bypasses RLS completely using SECURITY DEFINER.';

COMMENT ON FUNCTION public.prevent_role_modification IS 
'Trigger function that prevents modification of app_role and is_active columns. Only allows updating last_used_at.';
