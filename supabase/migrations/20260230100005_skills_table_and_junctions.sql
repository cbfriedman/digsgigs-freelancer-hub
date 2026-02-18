-- Dedicated skills table + junction tables for platform-wide skill matching
-- Upwork/Freelancer-style: curated skills for Diggers, gigs, portfolio items

-- =====================================================
-- 1. Skill categories (for grouping in UI)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.skill_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skill categories"
  ON public.skill_categories FOR SELECT
  USING (true);

-- =====================================================
-- 2. Skills (curated, platform-wide)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  skill_category_id uuid REFERENCES public.skill_categories(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skills_name_unique UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(skill_category_id);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON public.skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_name_lower ON public.skills(LOWER(name));

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skills"
  ON public.skills FOR SELECT
  USING (true);

-- =====================================================
-- 3. Junction: Digger skills
-- =====================================================
CREATE TABLE IF NOT EXISTS public.digger_skills (
  digger_profile_id uuid NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (digger_profile_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_digger_skills_skill ON public.digger_skills(skill_id);

ALTER TABLE public.digger_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view digger skills"
  ON public.digger_skills FOR SELECT USING (true);

CREATE POLICY "Diggers can manage own skills"
  ON public.digger_skills FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.digger_profiles dp WHERE dp.id = digger_profile_id AND dp.user_id = auth.uid())
  );

-- =====================================================
-- 4. Junction: Gig skills required
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gig_skills (
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gig_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_gig_skills_skill ON public.gig_skills(skill_id);

ALTER TABLE public.gig_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gig skills"
  ON public.gig_skills FOR SELECT USING (true);

CREATE POLICY "Giggers can manage gig skills"
  ON public.gig_skills FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND g.consumer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND g.consumer_id = auth.uid())
  );

-- =====================================================
-- 5. Junction: Portfolio item skills
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portfolio_item_skills (
  digger_portfolio_item_id uuid NOT NULL REFERENCES public.digger_portfolio_items(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (digger_portfolio_item_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_item_skills_skill ON public.portfolio_item_skills(skill_id);

ALTER TABLE public.portfolio_item_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolio item skills"
  ON public.portfolio_item_skills FOR SELECT USING (true);

CREATE POLICY "Diggers can manage portfolio item skills"
  ON public.portfolio_item_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.digger_portfolio_items pi
      JOIN public.digger_profiles dp ON dp.id = pi.digger_profile_id
      WHERE pi.id = digger_portfolio_item_id AND dp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.digger_portfolio_items pi
      JOIN public.digger_profiles dp ON dp.id = pi.digger_profile_id
      WHERE pi.id = digger_portfolio_item_id AND dp.user_id = auth.uid()
    )
  );
