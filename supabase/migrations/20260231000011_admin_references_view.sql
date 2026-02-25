-- Admins can view all references (full rows including contact) for support and user management
CREATE POLICY "Admins can view all references"
  ON public.references
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
