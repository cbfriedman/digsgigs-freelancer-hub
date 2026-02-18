-- Enable RLS on public.sender_addresses (table exposed to PostgREST).
-- No policies for anon/authenticated: API clients cannot read or modify sender addresses.
-- service_role (cron, edge functions) bypasses RLS and continues to use the table.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'sender_addresses'
  ) THEN
    ALTER TABLE public.sender_addresses ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
