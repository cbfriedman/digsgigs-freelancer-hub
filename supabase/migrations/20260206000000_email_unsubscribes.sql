-- Table for marketing/welcome email opt-out by email address (no login required)
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  email TEXT NOT NULL PRIMARY KEY,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'link' -- 'link' | 'preferences' | 'bounce'
);

-- Index for lookups when sending emails
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON public.email_unsubscribes(email);

-- RLS: only service role / backend should read; inserts/updates via edge function
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- No public policies: edge functions use service role and bypass RLS
-- Allow authenticated users to read their own (by matching auth.users.email)
CREATE POLICY "Users can check own email unsubscribe status"
  ON public.email_unsubscribes
  FOR SELECT
  USING (
    LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1))
  );

COMMENT ON TABLE public.email_unsubscribes IS 'Emails that opted out of marketing/welcome emails; checked before sending.';
