-- Fix 500 Internal Server Error on user_app_roles SELECT queries
-- This migration fixes potential issues with the trigger function and adds better error handling

-- ============================================
-- FIX 1: Fix trigger function to handle errors gracefully
-- ============================================

-- Update the prevent_role_modification function to handle missing JWT claims
CREATE OR REPLACE FUNCTION public.prevent_role_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role can do anything
  -- Handle case where JWT claims might not be available
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

-- ============================================
-- FIX 2: Ensure RLS policy is correct and working
-- ============================================

-- Drop and recreate the SELECT policy to ensure it's correct
DROP POLICY IF EXISTS "Users can view own app roles" ON public.user_app_roles;

CREATE POLICY "Users can view own app roles"
  ON public.user_app_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- FIX 3: Add a more robust function for getting user roles
-- ============================================

-- Drop first so we can change return type if it already exists
DROP FUNCTION IF EXISTS public.get_user_app_roles_safe(UUID);

-- Create a more robust function that handles errors gracefully
CREATE OR REPLACE FUNCTION public.get_user_app_roles_safe(_user_id UUID)
RETURNS TABLE(app_role user_app_role, last_used_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return roles for the user, handling any errors gracefully
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

COMMENT ON FUNCTION public.get_user_app_roles_safe IS 
'Safe function to get user app roles that handles errors gracefully. Returns empty result on error instead of throwing exception.';

-- ============================================
-- FIX 4: Verify indexes exist for performance
-- ============================================

-- Ensure indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_user_app_roles_user_id ON public.user_app_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_app_roles_app_role ON public.user_app_roles(app_role);
CREATE INDEX IF NOT EXISTS idx_user_app_roles_active ON public.user_app_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_app_roles_user_active ON public.user_app_roles(user_id, is_active) WHERE is_active = true;
