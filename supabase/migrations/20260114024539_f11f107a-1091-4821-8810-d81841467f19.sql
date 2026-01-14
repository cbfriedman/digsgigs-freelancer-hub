-- =====================================================
-- COMPLETE INDUSTRY TAXONOMY REPLACEMENT
-- Replacing all existing categories with 6 new tech-focused categories
-- =====================================================

-- Step 1: Clear existing profession assignments
DELETE FROM digger_profession_assignments;

-- Step 2: Clear existing professions
DELETE FROM professions;

-- Step 3: Clear existing industry categories  
DELETE FROM industry_categories;

-- Step 4: Insert new 6 top-level categories with proper UUIDs
INSERT INTO industry_categories (id, name, slug, description, display_order, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Software & Web Development', 'software-web-development', 'Web apps, SaaS, mobile, APIs, and technical development', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Design & Creative', 'design-creative', 'UI/UX, branding, graphics, and visual design', 2, true),
  ('33333333-3333-3333-3333-333333333333', 'Marketing & Growth', 'marketing-growth', 'Paid ads, SEO, CRO, email marketing, and analytics', 3, true),
  ('44444444-4444-4444-4444-444444444444', 'AI & Automation', 'ai-automation', 'AI tools, chatbots, workflow automation, and no-code solutions', 4, true),
  ('55555555-5555-5555-5555-555555555555', 'Business Systems & Operations', 'business-systems-operations', 'CRM, process automation, operations consulting', 5, true),
  ('66666666-6666-6666-6666-666666666666', 'Content & Media', 'content-media', 'Copywriting, video editing, podcasting, and content strategy', 6, true);

-- Step 5: Insert professions (subcategories) for each category
-- All lead pricing is now dynamic (3% of budget avg, min $9, max $49)

-- Software & Web Development
INSERT INTO professions (name, slug, industry_category_id, lead_tier, lead_price_cents, is_active, description, keywords) VALUES
  ('Full-Stack Development', 'full-stack-development', '11111111-1111-1111-1111-111111111111', 'high', 2500, true, 'End-to-end web application development', ARRAY['fullstack', 'full stack', 'nodejs', 'react', 'python']),
  ('Frontend Development (React / Next.js / Vue)', 'frontend-development', '11111111-1111-1111-1111-111111111111', 'high', 2500, true, 'React, Next.js, Vue.js development', ARRAY['react', 'nextjs', 'vue', 'frontend', 'javascript']),
  ('Backend Development (Node / Laravel / Django)', 'backend-development', '11111111-1111-1111-1111-111111111111', 'high', 2500, true, 'Server-side development', ARRAY['nodejs', 'laravel', 'django', 'backend', 'api']),
  ('Website Development', 'website-development', '11111111-1111-1111-1111-111111111111', 'mid', 1500, true, 'General website development', ARRAY['website', 'web development', 'wordpress', 'webflow']),
  ('SaaS / MVP Development', 'saas-mvp-development', '11111111-1111-1111-1111-111111111111', 'high', 2500, true, 'SaaS and MVP product development', ARRAY['saas', 'mvp', 'startup', 'product']),
  ('API Integrations', 'api-integrations', '11111111-1111-1111-1111-111111111111', 'mid', 1500, true, 'Third-party API integrations', ARRAY['api', 'integration', 'webhooks', 'rest']),
  ('Stripe / Payments Integration', 'stripe-payments-integration', '11111111-1111-1111-1111-111111111111', 'high', 2500, true, 'Payment gateway integrations', ARRAY['stripe', 'payments', 'checkout', 'billing']),
  ('Performance & Optimization', 'performance-optimization', '11111111-1111-1111-1111-111111111111', 'mid', 1500, true, 'Speed and performance optimization', ARRAY['performance', 'speed', 'optimization', 'caching']),
  ('Maintenance & Bug Fixes', 'maintenance-bug-fixes', '11111111-1111-1111-1111-111111111111', 'low', 1000, true, 'Ongoing maintenance and bug resolution', ARRAY['maintenance', 'bugs', 'fixes', 'support']);

-- Design & Creative
INSERT INTO professions (name, slug, industry_category_id, lead_tier, lead_price_cents, is_active, description, keywords) VALUES
  ('UI / UX Design', 'ui-ux-design', '22222222-2222-2222-2222-222222222222', 'high', 2500, true, 'User interface and experience design', ARRAY['ui', 'ux', 'user interface', 'user experience', 'figma']),
  ('Web & App Design', 'web-app-design', '22222222-2222-2222-2222-222222222222', 'mid', 1500, true, 'Visual design for web and mobile apps', ARRAY['web design', 'app design', 'mobile design']),
  ('Brand Identity & Logo Design', 'brand-identity-logo', '22222222-2222-2222-2222-222222222222', 'mid', 1500, true, 'Branding and logo creation', ARRAY['branding', 'logo', 'identity', 'brand design']),
  ('Pitch Deck Design', 'pitch-deck-design', '22222222-2222-2222-2222-222222222222', 'mid', 1500, true, 'Investor presentation design', ARRAY['pitch deck', 'investor', 'presentation', 'slides']),
  ('Marketing Design Assets', 'marketing-design-assets', '22222222-2222-2222-2222-222222222222', 'low', 1000, true, 'Social media and marketing graphics', ARRAY['social media', 'marketing', 'graphics', 'banners']),
  ('Product Design (Digital)', 'product-design-digital', '22222222-2222-2222-2222-222222222222', 'high', 2500, true, 'Digital product design', ARRAY['product design', 'digital product', 'saas design']);

-- Marketing & Growth
INSERT INTO professions (name, slug, industry_category_id, lead_tier, lead_price_cents, is_active, description, keywords) VALUES
  ('Paid Ads Management (Google / Meta)', 'paid-ads-management', '33333333-3333-3333-3333-333333333333', 'high', 2500, true, 'Google Ads and Meta advertising', ARRAY['google ads', 'facebook ads', 'ppc', 'paid advertising']),
  ('SEO Audit & Implementation', 'seo-audit-implementation', '33333333-3333-3333-3333-333333333333', 'mid', 1500, true, 'Search engine optimization', ARRAY['seo', 'search engine', 'rankings', 'organic']),
  ('Conversion Rate Optimization (CRO)', 'conversion-rate-optimization', '33333333-3333-3333-3333-333333333333', 'high', 2500, true, 'CRO and A/B testing', ARRAY['cro', 'conversion', 'ab testing', 'optimization']),
  ('Email Marketing Setup', 'email-marketing-setup', '33333333-3333-3333-3333-333333333333', 'mid', 1500, true, 'Email automation and campaigns', ARRAY['email', 'newsletter', 'automation', 'mailchimp']),
  ('Analytics & Tracking (GA4, GTM)', 'analytics-tracking', '33333333-3333-3333-3333-333333333333', 'mid', 1500, true, 'Analytics implementation', ARRAY['analytics', 'ga4', 'gtm', 'tracking', 'google analytics']),
  ('Landing Page Optimization', 'landing-page-optimization', '33333333-3333-3333-3333-333333333333', 'mid', 1500, true, 'Landing page design and optimization', ARRAY['landing page', 'conversion', 'optimization']),
  ('Marketing Automation', 'marketing-automation', '33333333-3333-3333-3333-333333333333', 'mid', 1500, true, 'Marketing automation workflows', ARRAY['automation', 'hubspot', 'marketing automation']);

-- AI & Automation
INSERT INTO professions (name, slug, industry_category_id, lead_tier, lead_price_cents, is_active, description, keywords) VALUES
  ('AI Automation (Zapier / Make / n8n)', 'ai-automation-zapier-make', '44444444-4444-4444-4444-444444444444', 'mid', 1500, true, 'Workflow automation tools', ARRAY['zapier', 'make', 'n8n', 'automation']),
  ('Chatbot Development', 'chatbot-development', '44444444-4444-4444-4444-444444444444', 'high', 2500, true, 'AI chatbot creation', ARRAY['chatbot', 'ai chat', 'conversational ai']),
  ('Internal Tools', 'internal-tools', '44444444-4444-4444-4444-444444444444', 'mid', 1500, true, 'Custom internal tool development', ARRAY['internal tools', 'admin panel', 'dashboards']),
  ('Workflow Automation', 'workflow-automation', '44444444-4444-4444-4444-444444444444', 'mid', 1500, true, 'Business workflow automation', ARRAY['workflow', 'automation', 'process']),
  ('No-Code / Low-Code MVPs', 'nocode-lowcode-mvps', '44444444-4444-4444-4444-444444444444', 'mid', 1500, true, 'Rapid prototyping with no-code tools', ARRAY['nocode', 'lowcode', 'bubble', 'webflow', 'mvp']),
  ('AI Integrations', 'ai-integrations', '44444444-4444-4444-4444-444444444444', 'high', 2500, true, 'AI/ML tool integrations', ARRAY['ai', 'openai', 'gpt', 'machine learning']);

-- Business Systems & Operations
INSERT INTO professions (name, slug, industry_category_id, lead_tier, lead_price_cents, is_active, description, keywords) VALUES
  ('CRM Setup & Customization', 'crm-setup-customization', '55555555-5555-5555-5555-555555555555', 'mid', 1500, true, 'CRM implementation and customization', ARRAY['crm', 'salesforce', 'hubspot', 'pipedrive']),
  ('Notion / Airtable Systems', 'notion-airtable-systems', '55555555-5555-5555-5555-555555555555', 'low', 1000, true, 'Productivity tool setup', ARRAY['notion', 'airtable', 'productivity', 'database']),
  ('Operations Consulting (SMB)', 'operations-consulting-smb', '55555555-5555-5555-5555-555555555555', 'mid', 1500, true, 'Small business operations consulting', ARRAY['operations', 'consulting', 'smb', 'process']),
  ('Process Automation', 'process-automation', '55555555-5555-5555-5555-555555555555', 'mid', 1500, true, 'Business process automation', ARRAY['process', 'automation', 'workflow']),
  ('Bookkeeping Setup (non-tax, non-CPA)', 'bookkeeping-setup', '55555555-5555-5555-5555-555555555555', 'low', 1000, true, 'Basic bookkeeping and accounting setup', ARRAY['bookkeeping', 'quickbooks', 'accounting']);

-- Content & Media
INSERT INTO professions (name, slug, industry_category_id, lead_tier, lead_price_cents, is_active, description, keywords) VALUES
  ('Website Copywriting', 'website-copywriting', '66666666-6666-6666-6666-666666666666', 'mid', 1500, true, 'Website copy and content', ARRAY['copywriting', 'website copy', 'content']),
  ('Technical Writing', 'technical-writing', '66666666-6666-6666-6666-666666666666', 'mid', 1500, true, 'Technical documentation', ARRAY['technical writing', 'documentation', 'docs']),
  ('Sales Pages & Funnels', 'sales-pages-funnels', '66666666-6666-6666-6666-666666666666', 'mid', 1500, true, 'Sales copy and funnel creation', ARRAY['sales page', 'funnel', 'conversion copy']),
  ('Video Editing (Business Use)', 'video-editing-business', '66666666-6666-6666-6666-666666666666', 'mid', 1500, true, 'Business video editing', ARRAY['video editing', 'video production', 'youtube']),
  ('Podcast Editing & Production', 'podcast-editing-production', '66666666-6666-6666-6666-666666666666', 'low', 1000, true, 'Podcast editing and production', ARRAY['podcast', 'audio editing', 'podcast production']),
  ('Content Strategy (Execution-focused)', 'content-strategy', '66666666-6666-6666-6666-666666666666', 'mid', 1500, true, 'Content planning and strategy', ARRAY['content strategy', 'content marketing', 'content plan']);