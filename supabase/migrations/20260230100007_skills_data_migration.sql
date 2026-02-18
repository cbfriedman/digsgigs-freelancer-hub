-- Migrate existing TEXT[] skills to junction tables
-- Match by skill name (case-insensitive). Unmatched skills are skipped.

-- Digger skills: from digger_profiles.skills and digger_profiles.keywords
INSERT INTO public.digger_skills (digger_profile_id, skill_id)
SELECT DISTINCT dp.id, s.id
FROM public.digger_profiles dp
CROSS JOIN LATERAL unnest(COALESCE(dp.skills, dp.keywords, '{}')::text[]) AS skill_name
JOIN public.skills s ON LOWER(TRIM(s.name)) = LOWER(TRIM(skill_name))
WHERE TRIM(skill_name) != ''
ON CONFLICT (digger_profile_id, skill_id) DO NOTHING;

-- Gig skills: from gigs.skills_required
INSERT INTO public.gig_skills (gig_id, skill_id)
SELECT DISTINCT g.id, s.id
FROM public.gigs g
CROSS JOIN LATERAL unnest(COALESCE(g.skills_required, '{}')::text[]) AS skill_name
JOIN public.skills s ON LOWER(TRIM(s.name)) = LOWER(TRIM(skill_name))
WHERE TRIM(skill_name) != ''
ON CONFLICT (gig_id, skill_id) DO NOTHING;

-- Portfolio item skills: from digger_portfolio_items.skills
INSERT INTO public.portfolio_item_skills (digger_portfolio_item_id, skill_id)
SELECT DISTINCT pi.id, s.id
FROM public.digger_portfolio_items pi
CROSS JOIN LATERAL unnest(COALESCE(pi.skills, '{}')::text[]) AS skill_name
JOIN public.skills s ON LOWER(TRIM(s.name)) = LOWER(TRIM(skill_name))
WHERE TRIM(skill_name) != ''
ON CONFLICT (digger_portfolio_item_id, skill_id) DO NOTHING;
