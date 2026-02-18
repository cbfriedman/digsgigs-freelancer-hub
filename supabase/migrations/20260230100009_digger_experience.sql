-- Work experience for Diggers: company, role, period, description
-- Giggers can see real experience to build trust

CREATE TABLE IF NOT EXISTS public.digger_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_profile_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  role_title text NOT NULL,
  employment_type text,
  location text,
  description text,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.digger_experience IS 'Digger work experience (company, role, period). Giggers can review to assess real experience.';
COMMENT ON COLUMN public.digger_experience.employment_type IS 'e.g. Full-time, Part-time, Contract, Freelance, Internship, Self-employed';
COMMENT ON COLUMN public.digger_experience.is_current IS 'When true, end_date is ignored and shown as "Present"';

CREATE INDEX IF NOT EXISTS idx_digger_experience_profile ON public.digger_experience(digger_profile_id);

ALTER TABLE public.digger_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view digger experience"
  ON public.digger_experience FOR SELECT
  USING (true);

CREATE POLICY "Diggers can manage own experience"
  ON public.digger_experience FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  );
