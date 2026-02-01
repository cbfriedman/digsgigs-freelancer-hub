-- Allow admins to view, insert, and manage all user_app_roles for User Management
-- Uses is_admin() which is SECURITY DEFINER and bypasses RLS - no recursion

-- Admins can view all profiles (for User Management user list)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can view all app roles (for User Management display)
CREATE POLICY "Admins can view all app roles"
  ON public.user_app_roles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can insert app roles for any user (for adding roles in User Management)
CREATE POLICY "Admins can insert app roles for any user"
  ON public.user_app_roles
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can delete app roles for any user (for removing roles in User Management)
CREATE POLICY "Admins can delete app roles for any user"
  ON public.user_app_roles
  FOR DELETE
  USING (public.is_admin(auth.uid()));
