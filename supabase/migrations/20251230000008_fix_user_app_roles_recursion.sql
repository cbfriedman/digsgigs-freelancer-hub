-- Fix infinite recursion in user_app_roles RLS policies
-- This ensures no policies call functions that query user_app_roles

-- ============================================
-- Step 1: Drop any policies that might cause recursion
-- ============================================

DROP POLICY IF EXISTS "Admins can view all app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Admins can manage all app roles" ON public.user_app_roles;
DROP POLICY IF EXISTS "Admins can view all user_app_roles" ON public.user_app_roles;

-- ============================================
-- Step 2: Ensure functions are properly set to bypass RLS
-- ============================================

-- Recreate is_admin function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct check for admin role, bypassing RLS completely
  RETURN EXISTS (
    SELECT 1
    FROM public.user_app_roles
    WHERE user_id = _user_id 
      AND app_role = 'admin'::user_app_role
      AND is_active = true
  );
END;
$$;

-- Recreate has_app_role function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id UUID, _role user_app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
-- Step 3: Ensure RLS policies are simple and don't call functions
-- ============================================

-- Drop and recreate SELECT policy to ensure it's simple
DROP POLICY IF EXISTS "Users can view own app roles" ON public.user_app_roles;

-- Simple policy that only checks user_id (no function calls)
CREATE POLICY "Users can view own app roles"
  ON public.user_app_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- Step 4: Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_app_role(UUID, user_app_role) TO authenticated;

COMMENT ON FUNCTION public.is_admin(UUID) IS 
'Check if a user has admin role. Bypasses RLS completely using SECURITY DEFINER. Use this function instead of querying user_app_roles directly.';
