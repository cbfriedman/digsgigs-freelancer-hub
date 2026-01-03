-- Fix infinite recursion in user_app_roles RLS policies
-- This migration ensures has_app_role function properly bypasses RLS

-- ============================================
-- FIX 1: Ensure has_app_role function bypasses RLS completely
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

-- ============================================
-- FIX 2: Ensure get_user_app_roles_safe also bypasses RLS
-- ============================================

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

-- ============================================
-- FIX 3: Ensure RLS policies don't cause recursion
-- ============================================

-- Drop and recreate the SELECT policy to ensure it's simple and doesn't cause recursion
DROP POLICY IF EXISTS "Users can view own app roles" ON public.user_app_roles;

-- Simple policy that only checks user_id (no function calls that could cause recursion)
CREATE POLICY "Users can view own app roles"
  ON public.user_app_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- FIX 4: Add a function specifically for checking admin role (bypasses RLS)
-- ============================================

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

COMMENT ON FUNCTION public.is_admin IS 
'Check if a user has admin role. Bypasses RLS completely using SECURITY DEFINER.';

-- ============================================
-- FIX 5: Grant execute permissions
-- ============================================

-- Ensure all authenticated users can call these functions
GRANT EXECUTE ON FUNCTION public.has_app_role(UUID, user_app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_app_roles_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
