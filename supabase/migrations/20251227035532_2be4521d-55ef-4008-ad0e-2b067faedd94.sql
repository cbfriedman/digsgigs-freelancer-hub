-- =====================================================
-- PHASE 1: Create new taxonomy management tables
-- =====================================================

-- Industry Categories Table (16 safe categories)
CREATE TABLE public.industry_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industry_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "Anyone can view active industry categories"
ON public.industry_categories FOR SELECT
USING (is_active = true);

-- Only admins can modify (via service role)
CREATE POLICY "Admins can manage industry categories"
ON public.industry_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- =====================================================
-- Professions Table (250+ approved professions)
-- =====================================================

CREATE TABLE public.professions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry_category_id UUID REFERENCES public.industry_categories(id) ON DELETE CASCADE,
  lead_tier TEXT NOT NULL CHECK (lead_tier IN ('low', 'mid', 'high')),
  lead_price_cents INTEGER NOT NULL DEFAULT 1500, -- $15 default
  is_licensed_risk BOOLEAN DEFAULT false, -- ALWAYS false for approved professions
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_profession_per_category UNIQUE(name, industry_category_id)
);

-- Enable RLS
ALTER TABLE public.professions ENABLE ROW LEVEL SECURITY;

-- Everyone can read active professions
CREATE POLICY "Anyone can view active professions"
ON public.professions FOR SELECT
USING (is_active = true);

-- Only admins can modify
CREATE POLICY "Admins can manage professions"
ON public.professions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_professions_category ON public.professions(industry_category_id);
CREATE INDEX idx_professions_lead_tier ON public.professions(lead_tier);
CREATE INDEX idx_professions_slug ON public.professions(slug);

-- =====================================================
-- Profession Specialties Table (optional subtypes/tags)
-- =====================================================

CREATE TABLE public.profession_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profession_id UUID REFERENCES public.professions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_specialty_per_profession UNIQUE(profession_id, slug)
);

-- Enable RLS
ALTER TABLE public.profession_specialties ENABLE ROW LEVEL SECURITY;

-- Everyone can read active specialties
CREATE POLICY "Anyone can view active specialties"
ON public.profession_specialties FOR SELECT
USING (is_active = true);

-- Only admins can modify
CREATE POLICY "Admins can manage specialties"
ON public.profession_specialties FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

CREATE INDEX idx_specialties_profession ON public.profession_specialties(profession_id);

-- =====================================================
-- Profession Requests Table (for "Request New Profession" feature)
-- =====================================================

CREATE TABLE public.profession_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_profession TEXT NOT NULL,
  industry_category TEXT,
  description TEXT,
  email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profession_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own profession requests"
ON public.profession_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can create requests
CREATE POLICY "Users can create profession requests"
ON public.profession_requests FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view and manage all requests
CREATE POLICY "Admins can manage all profession requests"
ON public.profession_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- =====================================================
-- Digger Profession Assignments Table (links diggers to approved professions)
-- =====================================================

CREATE TABLE public.digger_profession_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_profile_id UUID REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  profession_id UUID REFERENCES public.professions(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_digger_profession UNIQUE(digger_profile_id, profession_id)
);

-- Enable RLS
ALTER TABLE public.digger_profession_assignments ENABLE ROW LEVEL SECURITY;

-- Anyone can view assignments (for marketplace browsing)
CREATE POLICY "Anyone can view profession assignments"
ON public.digger_profession_assignments FOR SELECT
USING (true);

-- Users can manage their own assignments
CREATE POLICY "Users can manage their own profession assignments"
ON public.digger_profession_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.digger_profiles
    WHERE id = digger_profile_id AND user_id = auth.uid()
  )
);

CREATE INDEX idx_digger_profession_assignments_digger ON public.digger_profession_assignments(digger_profile_id);
CREATE INDEX idx_digger_profession_assignments_profession ON public.digger_profession_assignments(profession_id);

-- =====================================================
-- Update timestamp triggers
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_taxonomy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_industry_categories_timestamp
BEFORE UPDATE ON public.industry_categories
FOR EACH ROW EXECUTE FUNCTION public.update_taxonomy_timestamp();

CREATE TRIGGER update_professions_timestamp
BEFORE UPDATE ON public.professions
FOR EACH ROW EXECUTE FUNCTION public.update_taxonomy_timestamp();

CREATE TRIGGER update_profession_requests_timestamp
BEFORE UPDATE ON public.profession_requests
FOR EACH ROW EXECUTE FUNCTION public.update_taxonomy_timestamp();