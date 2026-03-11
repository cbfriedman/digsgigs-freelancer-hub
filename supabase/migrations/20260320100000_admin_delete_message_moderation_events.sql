-- Allow admins to delete message moderation events (selectively or clear all).
CREATE POLICY "Admins can delete moderation events"
  ON public.message_moderation_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_app_roles
      WHERE user_id = auth.uid() AND app_role = 'admin' AND is_active = true
    )
  );

COMMENT ON POLICY "Admins can delete moderation events" ON public.message_moderation_events IS
  'Admins can remove moderation log entries from the dashboard (selective or clear all).';
