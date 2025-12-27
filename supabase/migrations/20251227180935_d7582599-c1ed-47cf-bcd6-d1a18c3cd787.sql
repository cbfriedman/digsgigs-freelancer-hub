-- Add Venture Capital & Startup Funding Support industry
INSERT INTO public.industry_categories (name, slug, description, icon, display_order, is_active)
VALUES (
  'Venture Capital & Startup Funding Support',
  'venture-capital-startup-funding-support',
  'Connect with experienced advisors who help founders prepare for fundraising. These professionals offer pitch coaching, capital-raise strategy, investor relations support, and grant funding guidance. Digs & Gigs does not broker investments or sell securities. All fundraising and investment decisions happen directly between you and your advisor.',
  'TrendingUp',
  17,
  true
);

-- Get the industry ID for inserting professions
DO $$
DECLARE
  vc_industry_id UUID;
  prof_id UUID;
BEGIN
  SELECT id INTO vc_industry_id FROM public.industry_categories WHERE slug = 'venture-capital-startup-funding-support';
  
  -- Insert professions with $25 lead tier (2500 cents) = 'high' tier
  
  -- 1. Startup Funding Consultant
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Startup Funding Consultant', 'startup-funding-consultant', 'high', 2500, false, 
    ARRAY['startup funding', 'fundraising consultant', 'capital raise', 'seed funding', 'series a'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'Pre-seed Stage', 'pre-seed-stage'),
    (prof_id, 'Seed Stage', 'seed-stage'),
    (prof_id, 'Series A', 'series-a'),
    (prof_id, 'Growth Stage', 'growth-stage'),
    (prof_id, 'SaaS', 'saas'),
    (prof_id, 'Fintech', 'fintech'),
    (prof_id, 'AI & Automation', 'ai-automation'),
    (prof_id, 'Health/Medtech', 'health-medtech');

  -- 2. Capital Raise Advisor
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Capital Raise Advisor', 'capital-raise-advisor', 'high', 2500, false, 
    ARRAY['capital raise', 'fundraising advisor', 'investment strategy', 'equity raise'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'Pre-seed Stage', 'pre-seed-stage'),
    (prof_id, 'Seed Stage', 'seed-stage'),
    (prof_id, 'Series A', 'series-a'),
    (prof_id, 'Marketplaces', 'marketplaces'),
    (prof_id, 'Consumer', 'consumer'),
    (prof_id, 'Climate/CleanTech', 'climate-cleantech');

  -- 3. Pitch Deck & Fundraising Coach
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Pitch Deck & Fundraising Coach', 'pitch-deck-fundraising-coach', 'high', 2500, false, 
    ARRAY['pitch deck', 'pitch coaching', 'fundraising coach', 'investor presentation', 'pitch practice'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'Pitch Deck Review', 'pitch-deck-review'),
    (prof_id, 'Pitch Coaching', 'pitch-coaching'),
    (prof_id, 'Fundraising Strategy', 'fundraising-strategy'),
    (prof_id, 'Investor Outreach Strategy', 'investor-outreach-strategy');

  -- 4. Investor Relations Consultant
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Investor Relations Consultant', 'investor-relations-consultant', 'high', 2500, false, 
    ARRAY['investor relations', 'IR consultant', 'investor communications', 'shareholder relations'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'Investor Outreach Strategy', 'investor-outreach-strategy'),
    (prof_id, 'Data Room Preparation', 'data-room-preparation'),
    (prof_id, 'Financial Model Review', 'financial-model-review');

  -- 5. Venture Capital Advisor
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Venture Capital Advisor', 'venture-capital-advisor', 'high', 2500, false, 
    ARRAY['VC advisor', 'venture capital', 'startup advisor', 'investment advisor'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'SaaS', 'saas'),
    (prof_id, 'Fintech', 'fintech'),
    (prof_id, 'AI & Automation', 'ai-automation'),
    (prof_id, 'PropTech/Real Estate', 'proptech-real-estate');

  -- 6. Angel Investor (Advisory Only)
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Angel Investor (Advisory Only)', 'angel-investor-advisory', 'high', 2500, false, 
    ARRAY['angel investor', 'angel advisory', 'early stage advisor', 'startup angel'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'Pre-seed Stage', 'pre-seed-stage'),
    (prof_id, 'Seed Stage', 'seed-stage'),
    (prof_id, 'Consumer', 'consumer'),
    (prof_id, 'Marketplaces', 'marketplaces');

  -- 7. Startup Mentor / Advisor
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Startup Mentor / Advisor', 'startup-mentor-advisor', 'high', 2500, false, 
    ARRAY['startup mentor', 'startup advisor', 'founder mentor', 'entrepreneurship coach'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'Pre-seed Stage', 'pre-seed-stage'),
    (prof_id, 'Seed Stage', 'seed-stage'),
    (prof_id, 'Series A', 'series-a'),
    (prof_id, 'Growth Stage', 'growth-stage'),
    (prof_id, 'Fundraising Strategy', 'fundraising-strategy');

  -- 8. Grant Funding Specialist
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Grant Funding Specialist', 'grant-funding-specialist', 'high', 2500, false, 
    ARRAY['grant funding', 'SBIR', 'government grants', 'non-dilutive funding', 'grant writer'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'Climate/CleanTech', 'climate-cleantech'),
    (prof_id, 'Health/Medtech', 'health-medtech'),
    (prof_id, 'AI & Automation', 'ai-automation');

  -- 9. Family Office Advisor (Advisory Only)
  INSERT INTO public.professions (industry_category_id, name, slug, lead_tier, lead_price_cents, is_licensed_risk, keywords)
  VALUES (vc_industry_id, 'Family Office Advisor (Advisory Only)', 'family-office-advisor-advisory', 'high', 2500, false, 
    ARRAY['family office', 'family office advisor', 'wealth advisory', 'family investment'])
  RETURNING id INTO prof_id;
  
  INSERT INTO public.profession_specialties (profession_id, name, slug) VALUES
    (prof_id, 'Growth Stage', 'growth-stage'),
    (prof_id, 'PropTech/Real Estate', 'proptech-real-estate'),
    (prof_id, 'Climate/CleanTech', 'climate-cleantech');

END $$;