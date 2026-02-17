-- Allow Diggers to delete their own references (profile owner management)
CREATE POLICY "Diggers can delete own references"
  ON public.references FOR DELETE
  TO authenticated
  USING (digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()));
