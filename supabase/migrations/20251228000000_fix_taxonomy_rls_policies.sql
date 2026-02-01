-- Fix RLS policies for taxonomy tables to allow public read access
-- This ensures both authenticated and anonymous users can view professions

-- Drop existing policies (both old and new names for idempotency)
DROP POLICY IF EXISTS "Anyone can view active industry categories" ON public.industry_categories;
DROP POLICY IF EXISTS "Public can view active industry categories" ON public.industry_categories;
DROP POLICY IF EXISTS "Anyone can view active professions" ON public.professions;
DROP POLICY IF EXISTS "Public can view active professions" ON public.professions;
DROP POLICY IF EXISTS "Anyone can view active specialties" ON public.profession_specialties;
DROP POLICY IF EXISTS "Public can view active specialties" ON public.profession_specialties;

-- Recreate policies with explicit public access (no TO clause = all roles)
CREATE POLICY "Public can view active industry categories"
ON public.industry_categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Public can view active professions"
ON public.professions FOR SELECT
USING (is_active = true);

CREATE POLICY "Public can view active specialties"
ON public.profession_specialties FOR SELECT
USING (is_active = true);

