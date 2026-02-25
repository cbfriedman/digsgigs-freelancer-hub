-- Giggers can view all references (full rows) when viewing any digger's profile page
CREATE POLICY "Giggers can view all references"
  ON public.references
  FOR SELECT
  TO authenticated
  USING (public.has_app_role(auth.uid(), 'gigger'::user_app_role));
