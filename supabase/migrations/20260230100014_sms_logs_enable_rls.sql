-- Enable RLS on public.sms_logs (table exposed to PostgREST).
-- No policies for anon/authenticated: API clients cannot read or modify SMS logs.
-- service_role (Edge Functions, e.g. send-sms) bypasses RLS and continues to write logs.

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
