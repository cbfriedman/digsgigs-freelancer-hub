-- Fix 500 Internal Server Error on SELECT queries to user_app_roles
-- This migration ensures SELECT operations work correctly without 500 errors

-- ============================================
-- FIX 1: Drop and recreate SELECT policy with absolute simplicity
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own app roles" ON public.user_app_roles;

-- Create the simplest possible SELECT policy
-- This policy ONLY checks user_id matches auth.uid() - no function calls, no subqueries
CREATE POLICY "Users can view own app roles"
  ON public.user_app_roles
  FOR SELECT
  USING (
    -- Simple direct check - no function calls that could cause recursion or errors
    user_id = auth.uid()
  );

-- ============================================
-- FIX 2: Ensure RLS is enabled
-- ============================================

ALTER TABLE public.user_app_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FIX 3: Verify the policy is correct
-- ============================================

-- The SELECT policy should be:
-- - Simple: only checks user_id = auth.uid()
-- - No function calls in USING clause
-- - No subqueries that could cause recursion
-- - No references to other tables that might have RLS issues

COMMENT ON POLICY "Users can view own app roles" ON public.user_app_roles IS 
'Simple SELECT policy that allows users to view their own app roles. Uses only direct user_id comparison to avoid recursion or 500 errors.';
