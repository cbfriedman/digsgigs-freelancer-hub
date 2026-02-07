-- Contact form submissions (from /contact page) so you can see messages users send
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserts are done by the submit-contact-form edge function (service role). You view rows in Supabase Dashboard → Table Editor.
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access contact_submissions"
  ON public.contact_submissions FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.contact_submissions IS 'Messages sent via the Contact Us form; view in Supabase Table Editor or admin.';
