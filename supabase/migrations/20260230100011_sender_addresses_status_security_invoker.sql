-- Fix: View public.sender_addresses_status was defined with default SECURITY DEFINER
-- (view owner's permissions). Set security_invoker = true so the view uses the
-- querying user's permissions and RLS on sender_addresses is respected.
-- See: https://www.postgresql.org/docs/current/sql-createview.html#SQL-CREATEVIEW-SECURITY-INVOKER

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'sender_addresses_status'
  ) THEN
    ALTER VIEW public.sender_addresses_status SET (security_invoker = true);
  END IF;
END $$;
