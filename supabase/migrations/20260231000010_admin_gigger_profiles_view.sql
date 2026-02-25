-- Admins can view all gigger_profiles (for User Management and support)
-- Uses is_admin() which is SECURITY DEFINER and bypasses RLS

CREATE POLICY "Admins can view all gigger profiles"
  ON public.gigger_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
