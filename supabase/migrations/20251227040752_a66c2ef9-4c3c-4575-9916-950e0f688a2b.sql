-- First, clear existing data
DELETE FROM profession_specialties;
DELETE FROM professions;
DELETE FROM industry_categories;

-- Insert the 16 industries from CSV
INSERT INTO industry_categories (name, slug, description, display_order, is_active) VALUES
('Design & Creative', 'design-creative', 'Graphic design, UI/UX, branding, illustration, and visual arts', 1, true),
('Video, Animation & Audio', 'video-animation-audio', 'Video editing, animation, motion graphics, voiceover, and audio production', 2, true),
('Writing, Editing & Translation', 'writing-editing-translation', 'Content writing, copywriting, editing, proofreading, and translation services', 3, true),
('Marketing & Advertising', 'marketing-advertising', 'Social media, SEO, PPC, email marketing, and brand strategy', 4, true),
('Web, Software & App Development', 'web-software-app-development', 'Frontend, backend, full stack, WordPress, Shopify, and mobile app development', 5, true),
('IT, Cybersecurity & Data', 'it-cybersecurity-data', 'IT support, cloud services, data analysis, and cybersecurity', 6, true),
('AI, Automation & No-Code', 'ai-automation-nocode', 'AI tools, automation, chatbots, and no-code development', 7, true),
('Business, Admin & Virtual Assistance', 'business-admin-va', 'Virtual assistants, admin support, project coordination, and data entry', 8, true),
('Sales & Customer Support', 'sales-customer-support', 'Customer service, lead generation, appointment setting, and sales support', 9, true),
('E-commerce & Product Services', 'ecommerce-product-services', 'Amazon, Shopify, product listings, dropshipping, and product photography', 10, true),
('Education, Tutoring & Coaching', 'education-tutoring-coaching', 'Academic tutoring, skills training, life coaching, and career coaching', 11, true),
('Legal Support Services', 'legal-support-services', 'Paralegal work, legal research, document preparation (non-attorney)', 12, true),
('Architecture & Interior Support', 'architecture-interior-support', 'Architectural drafting, BIM, 3D rendering, interior design support', 13, true),
('Engineering & Construction Support', 'engineering-construction-support', 'CAD drafting, estimating, project scheduling, documentation', 14, true),
('Real Estate & Finance Support', 'real-estate-finance-support', 'Transaction coordination, bookkeeping, financial admin (non-licensed)', 15, true),
('Other Remote Services', 'other-remote-services', 'Community management, event production, podcasting, and more', 16, true);

-- Insert all professions from CSV with correct lead tiers
-- Design & Creative ($15-25)
INSERT INTO professions (name, slug, industry_category_id, lead_tier, lead_price_cents, is_active, keywords) VALUES
('Graphic Designer', 'graphic-designer', (SELECT id FROM industry_categories WHERE slug = 'design-creative'), 'mid', 1500, true, ARRAY['logo', 'brand', 'social media graphics', 'print materials']),
('Brand Identity Designer', 'brand-identity-designer', (SELECT id FROM industry_categories WHERE slug = 'design-creative'), 'high', 2500, true, ARRAY['brand strategy', 'brand guidelines', 'identity']),
('Illustrator', 'illustrator', (SELECT id FROM industry_categories WHERE slug = 'design-creative'), 'mid', 1500, true, ARRAY['childrens books', 'character illustration', 'drawing']),
('Web Designer', 'web-designer', (SELECT id FROM industry_categories WHERE slug = 'design-creative'), 'high', 2500, true, ARRAY['landing pages', 'ecommerce pages', 'website design']),
('UI/UX Designer', 'ui-ux-designer', (SELECT id FROM industry_categories WHERE slug = 'design-creative'), 'high', 2500, true, ARRAY['mobile ui', 'web app ui', 'wireframing', 'prototyping']),
('Presentation Designer', 'presentation-designer', (SELECT id FROM industry_categories WHERE slug = 'design-creative'), 'high', 2500, true, ARRAY['pitch decks', 'powerpoint', 'keynote']),
('Packaging Designer', 'packaging-designer', (SELECT id FROM industry_categories WHERE slug = 'design-creative'), 'high', 2500, true, ARRAY['product packaging', 'box design', 'label design']),
('3D Artist', '3d-artist', (SELECT id FROM industry_categories WHERE slug = 'design-creative'), 'high', 2500, true, ARRAY['product rendering', '3d modeling', 'visualization']),

-- Video, Animation & Audio ($15-25)
('Video Editor', 'video-editor', (SELECT id FROM industry_categories WHERE slug = 'video-animation-audio'), 'mid', 1500, true, ARRAY['youtube editing', 'tiktok', 'reels', 'corporate videos']),
('Animator', 'animator', (SELECT id FROM industry_categories WHERE slug = 'video-animation-audio'), 'high', 2500, true, ARRAY['2d animation', '3d animation', 'motion']),
('Motion Graphics Designer', 'motion-graphics-designer', (SELECT id FROM industry_categories WHERE slug = 'video-animation-audio'), 'high', 2500, true, ARRAY['explainers', 'motion graphics', 'after effects']),
('Voiceover Artist', 'voiceover-artist', (SELECT id FROM industry_categories WHERE slug = 'video-animation-audio'), 'mid', 1500, true, ARRAY['commercial vo', 'narration', 'voice acting']),
('Podcast Editor', 'podcast-editor', (SELECT id FROM industry_categories WHERE slug = 'video-animation-audio'), 'mid', 1500, true, ARRAY['podcast production', 'audio editing', 'sound design']),

-- Writing, Editing & Translation ($10-25)
('Content Writer', 'content-writer', (SELECT id FROM industry_categories WHERE slug = 'writing-editing-translation'), 'mid', 1500, true, ARRAY['seo articles', 'blog posts', 'web content']),
('Copywriter', 'copywriter', (SELECT id FROM industry_categories WHERE slug = 'writing-editing-translation'), 'high', 2500, true, ARRAY['sales pages', 'ad copy', 'conversion copy']),
('Technical Writer', 'technical-writer', (SELECT id FROM industry_categories WHERE slug = 'writing-editing-translation'), 'high', 2500, true, ARRAY['documentation', 'manuals', 'technical docs']),
('Scriptwriter', 'scriptwriter', (SELECT id FROM industry_categories WHERE slug = 'writing-editing-translation'), 'mid', 1500, true, ARRAY['youtube scripts', 'video scripts', 'screenwriting']),
('Ghostwriter', 'ghostwriter', (SELECT id FROM industry_categories WHERE slug = 'writing-editing-translation'), 'high', 2500, true, ARRAY['books', 'ebooks', 'articles']),
('Editor', 'editor', (SELECT id FROM industry_categories WHERE slug = 'writing-editing-translation'), 'low', 1000, true, ARRAY['proofreading', 'copy editing', 'line editing']),
('Translator', 'translator', (SELECT id FROM industry_categories WHERE slug = 'writing-editing-translation'), 'mid', 1500, true, ARRAY['english-spanish', 'translation', 'localization']),

-- Marketing & Advertising ($15-25)
('Social Media Manager', 'social-media-manager', (SELECT id FROM industry_categories WHERE slug = 'marketing-advertising'), 'mid', 1500, true, ARRAY['instagram', 'tiktok', 'facebook', 'linkedin']),
('Digital Marketer', 'digital-marketer', (SELECT id FROM industry_categories WHERE slug = 'marketing-advertising'), 'high', 2500, true, ARRAY['funnel optimization', 'conversion', 'marketing strategy']),
('SEO Specialist', 'seo-specialist', (SELECT id FROM industry_categories WHERE slug = 'marketing-advertising'), 'high', 2500, true, ARRAY['local seo', 'technical seo', 'link building']),
('PPC Manager', 'ppc-manager', (SELECT id FROM industry_categories WHERE slug = 'marketing-advertising'), 'high', 2500, true, ARRAY['google ads', 'facebook ads', 'paid advertising']),
('Email Marketer', 'email-marketer', (SELECT id FROM industry_categories WHERE slug = 'marketing-advertising'), 'mid', 1500, true, ARRAY['automation', 'email campaigns', 'newsletters']),
('Brand Strategist', 'brand-strategist', (SELECT id FROM industry_categories WHERE slug = 'marketing-advertising'), 'high', 2500, true, ARRAY['brand strategy', 'positioning', 'messaging']),

-- Web, Software & App Development ($15-25)
('Frontend Developer', 'frontend-developer', (SELECT id FROM industry_categories WHERE slug = 'web-software-app-development'), 'high', 2500, true, ARRAY['react', 'vue', 'javascript', 'html', 'css']),
('Backend Developer', 'backend-developer', (SELECT id FROM industry_categories WHERE slug = 'web-software-app-development'), 'high', 2500, true, ARRAY['node.js', 'php', 'python', 'api']),
('Full Stack Developer', 'full-stack-developer', (SELECT id FROM industry_categories WHERE slug = 'web-software-app-development'), 'high', 2500, true, ARRAY['full stack', 'web development', 'mern', 'lamp']),
('WordPress Developer', 'wordpress-developer', (SELECT id FROM industry_categories WHERE slug = 'web-software-app-development'), 'high', 2500, true, ARRAY['custom themes', 'plugins', 'wordpress']),
('Shopify Developer', 'shopify-developer', (SELECT id FROM industry_categories WHERE slug = 'web-software-app-development'), 'high', 2500, true, ARRAY['custom stores', 'shopify apps', 'liquid']),
('Mobile App Developer', 'mobile-app-developer', (SELECT id FROM industry_categories WHERE slug = 'web-software-app-development'), 'high', 2500, true, ARRAY['flutter', 'react native', 'ios', 'android']),
('QA Engineer', 'qa-engineer', (SELECT id FROM industry_categories WHERE slug = 'web-software-app-development'), 'mid', 1500, true, ARRAY['testing', 'quality assurance', 'automation testing']),

-- IT, Cybersecurity & Data ($10-25)
('IT Support Specialist', 'it-support-specialist', (SELECT id FROM industry_categories WHERE slug = 'it-cybersecurity-data'), 'mid', 1500, true, ARRAY['tech support', 'troubleshooting', 'it help']),
('Help Desk Technician', 'help-desk-technician', (SELECT id FROM industry_categories WHERE slug = 'it-cybersecurity-data'), 'low', 1000, true, ARRAY['help desk', 'tier 1 support', 'customer tech support']),
('Cloud Support Specialist', 'cloud-support-specialist', (SELECT id FROM industry_categories WHERE slug = 'it-cybersecurity-data'), 'high', 2500, true, ARRAY['aws', 'azure', 'gcp', 'cloud infrastructure']),
('Data Analyst', 'data-analyst', (SELECT id FROM industry_categories WHERE slug = 'it-cybersecurity-data'), 'high', 2500, true, ARRAY['power bi', 'tableau', 'excel', 'data visualization']),
('Cybersecurity Support Analyst', 'cybersecurity-support-analyst', (SELECT id FROM industry_categories WHERE slug = 'it-cybersecurity-data'), 'high', 2500, true, ARRAY['security', 'vulnerability', 'compliance']),
('Database Administrator', 'database-administrator', (SELECT id FROM industry_categories WHERE slug = 'it-cybersecurity-data'), 'high', 2500, true, ARRAY['sql', 'database', 'mysql', 'postgresql']),

-- AI, Automation & No-Code ($10-25)
('AI Prompt Engineer', 'ai-prompt-engineer', (SELECT id FROM industry_categories WHERE slug = 'ai-automation-nocode'), 'high', 2500, true, ARRAY['prompt engineering', 'ai prompts', 'llm']),
('ChatGPT Specialist', 'chatgpt-specialist', (SELECT id FROM industry_categories WHERE slug = 'ai-automation-nocode'), 'high', 2500, true, ARRAY['chatgpt', 'openai', 'ai automation']),
('Zapier Expert', 'zapier-expert', (SELECT id FROM industry_categories WHERE slug = 'ai-automation-nocode'), 'high', 2500, true, ARRAY['zapier', 'workflow automation', 'integrations']),
('Make.com Expert', 'make-expert', (SELECT id FROM industry_categories WHERE slug = 'ai-automation-nocode'), 'high', 2500, true, ARRAY['make.com', 'integromat', 'automation']),
('No-Code Developer', 'no-code-developer', (SELECT id FROM industry_categories WHERE slug = 'ai-automation-nocode'), 'high', 2500, true, ARRAY['bubble', 'webflow', 'no code']),
('Custom Chatbot Builder', 'custom-chatbot-builder', (SELECT id FROM industry_categories WHERE slug = 'ai-automation-nocode'), 'high', 2500, true, ARRAY['chatbot', 'conversational ai', 'bot development']),
('Data Labeling Specialist', 'data-labeling-specialist', (SELECT id FROM industry_categories WHERE slug = 'ai-automation-nocode'), 'low', 1000, true, ARRAY['data labeling', 'annotation', 'ai training data']),

-- Business, Admin & Virtual Assistance ($10-25)
('Virtual Assistant', 'virtual-assistant', (SELECT id FROM industry_categories WHERE slug = 'business-admin-va'), 'low', 1000, true, ARRAY['general admin', 'email support', 'scheduling']),
('Executive Assistant', 'executive-assistant', (SELECT id FROM industry_categories WHERE slug = 'business-admin-va'), 'mid', 1500, true, ARRAY['executive support', 'calendar management', 'travel']),
('Operations Assistant', 'operations-assistant', (SELECT id FROM industry_categories WHERE slug = 'business-admin-va'), 'mid', 1500, true, ARRAY['operations', 'process management', 'coordination']),
('Project Coordinator', 'project-coordinator', (SELECT id FROM industry_categories WHERE slug = 'business-admin-va'), 'mid', 1500, true, ARRAY['project management', 'coordination', 'planning']),
('Research Specialist', 'research-specialist', (SELECT id FROM industry_categories WHERE slug = 'business-admin-va'), 'low', 1000, true, ARRAY['research', 'market research', 'competitive analysis']),
('Data Entry Specialist', 'data-entry-specialist', (SELECT id FROM industry_categories WHERE slug = 'business-admin-va'), 'low', 1000, true, ARRAY['data entry', 'spreadsheets', 'data processing']),
('Online Business Manager', 'online-business-manager', (SELECT id FROM industry_categories WHERE slug = 'business-admin-va'), 'high', 2500, true, ARRAY['obm', 'business management', 'operations']),

-- Sales & Customer Support ($10-15)
('Customer Support Agent', 'customer-support-agent', (SELECT id FROM industry_categories WHERE slug = 'sales-customer-support'), 'low', 1000, true, ARRAY['email support', 'live chat', 'customer service']),
('Client Success Specialist', 'client-success-specialist', (SELECT id FROM industry_categories WHERE slug = 'sales-customer-support'), 'mid', 1500, true, ARRAY['client success', 'account management', 'retention']),
('Appointment Setter', 'appointment-setter', (SELECT id FROM industry_categories WHERE slug = 'sales-customer-support'), 'low', 1000, true, ARRAY['appointment setting', 'scheduling', 'outreach']),
('Lead Generation Specialist', 'lead-generation-specialist', (SELECT id FROM industry_categories WHERE slug = 'sales-customer-support'), 'mid', 1500, true, ARRAY['lead gen', 'prospecting', 'outbound']),
('SDR', 'sdr', (SELECT id FROM industry_categories WHERE slug = 'sales-customer-support'), 'mid', 1500, true, ARRAY['sales development', 'outbound sales', 'cold calling']),

-- E-commerce & Product Services ($10-15)
('Ecommerce Store Manager', 'ecommerce-store-manager', (SELECT id FROM industry_categories WHERE slug = 'ecommerce-product-services'), 'mid', 1500, true, ARRAY['store management', 'ecommerce operations', 'inventory']),
('Amazon Marketplace Specialist', 'amazon-marketplace-specialist', (SELECT id FROM industry_categories WHERE slug = 'ecommerce-product-services'), 'mid', 1500, true, ARRAY['amazon fba', 'amazon seller', 'marketplace']),
('Shopify Store Operator', 'shopify-store-operator', (SELECT id FROM industry_categories WHERE slug = 'ecommerce-product-services'), 'mid', 1500, true, ARRAY['shopify', 'store operations', 'ecommerce']),
('Product Listing Specialist', 'product-listing-specialist', (SELECT id FROM industry_categories WHERE slug = 'ecommerce-product-services'), 'low', 1000, true, ARRAY['product listings', 'catalog', 'descriptions']),
('Product Researcher', 'product-researcher', (SELECT id FROM industry_categories WHERE slug = 'ecommerce-product-services'), 'low', 1000, true, ARRAY['product research', 'sourcing', 'market analysis']),
('Dropshipping Assistant', 'dropshipping-assistant', (SELECT id FROM industry_categories WHERE slug = 'ecommerce-product-services'), 'low', 1000, true, ARRAY['dropshipping', 'order fulfillment', 'supplier management']),
('Product Photographer', 'product-photographer', (SELECT id FROM industry_categories WHERE slug = 'ecommerce-product-services'), 'mid', 1500, true, ARRAY['product photography', 'ecommerce photos', 'amazon photos']),

-- Education, Tutoring & Coaching ($15-25)
('Academic Tutor', 'academic-tutor', (SELECT id FROM industry_categories WHERE slug = 'education-tutoring-coaching'), 'mid', 1500, true, ARRAY['math', 'science', 'esl', 'test prep']),
('Skills Tutor', 'skills-tutor', (SELECT id FROM industry_categories WHERE slug = 'education-tutoring-coaching'), 'mid', 1500, true, ARRAY['coding', 'music lessons', 'art lessons']),
('Life Coach', 'life-coach', (SELECT id FROM industry_categories WHERE slug = 'education-tutoring-coaching'), 'mid', 1500, true, ARRAY['life coaching', 'personal development', 'mindset']),
('Business Coach', 'business-coach', (SELECT id FROM industry_categories WHERE slug = 'education-tutoring-coaching'), 'high', 2500, true, ARRAY['business coaching', 'entrepreneur coaching', 'startup']),
('Career Coach', 'career-coach', (SELECT id FROM industry_categories WHERE slug = 'education-tutoring-coaching'), 'mid', 1500, true, ARRAY['career coaching', 'job search', 'resume']),
('Fitness Coach', 'fitness-coach', (SELECT id FROM industry_categories WHERE slug = 'education-tutoring-coaching'), 'mid', 1500, true, ARRAY['personal training', 'fitness', 'workout']),
('Nutrition Coach', 'nutrition-coach', (SELECT id FROM industry_categories WHERE slug = 'education-tutoring-coaching'), 'mid', 1500, true, ARRAY['nutrition', 'diet', 'meal planning']),

-- Legal Support Services ($15-25) - NON-ATTORNEY ONLY
('Paralegal (Non-Attorney)', 'paralegal', (SELECT id FROM industry_categories WHERE slug = 'legal-support-services'), 'high', 2500, true, ARRAY['paralegal', 'legal support', 'case management']),
('Legal Researcher', 'legal-researcher', (SELECT id FROM industry_categories WHERE slug = 'legal-support-services'), 'high', 2500, true, ARRAY['legal research', 'case law', 'citations']),
('Legal Document Preparer', 'legal-document-preparer', (SELECT id FROM industry_categories WHERE slug = 'legal-support-services'), 'high', 2500, true, ARRAY['document preparation', 'legal forms', 'filings']),
('Contract Formatter', 'contract-formatter', (SELECT id FROM industry_categories WHERE slug = 'legal-support-services'), 'mid', 1500, true, ARRAY['contract formatting', 'document formatting', 'templates']),
('Deposition Summary Specialist', 'deposition-summary-specialist', (SELECT id FROM industry_categories WHERE slug = 'legal-support-services'), 'high', 2500, true, ARRAY['deposition summaries', 'legal transcription', 'litigation support']),

-- Architecture & Interior Support ($25) - DRAFTING ONLY
('Architectural Drafter', 'architectural-drafter', (SELECT id FROM industry_categories WHERE slug = 'architecture-interior-support'), 'high', 2500, true, ARRAY['architectural drafting', 'autocad', 'revit']),
('BIM Technician', 'bim-technician', (SELECT id FROM industry_categories WHERE slug = 'architecture-interior-support'), 'high', 2500, true, ARRAY['bim', 'revit', 'building information modeling']),
('3D Architectural Renderer', '3d-architectural-renderer', (SELECT id FROM industry_categories WHERE slug = 'architecture-interior-support'), 'high', 2500, true, ARRAY['3d rendering', 'visualization', 'architectural visualization']),
('Interior Designer', 'interior-designer', (SELECT id FROM industry_categories WHERE slug = 'architecture-interior-support'), 'high', 2500, true, ARRAY['interior design', 'conceptual design', 'space design']),
('Space Planner', 'space-planner', (SELECT id FROM industry_categories WHERE slug = 'architecture-interior-support'), 'high', 2500, true, ARRAY['space planning', 'layout', 'floor plans']),

-- Engineering & Construction Support ($25) - DRAFTING ONLY
('CAD Drafter', 'cad-drafter', (SELECT id FROM industry_categories WHERE slug = 'engineering-construction-support'), 'high', 2500, true, ARRAY['mechanical', 'electrical', 'civil', 'cad', 'autocad']),
('Structural Drafting Technician', 'structural-drafting-technician', (SELECT id FROM industry_categories WHERE slug = 'engineering-construction-support'), 'high', 2500, true, ARRAY['structural drafting', 'steel detailing', 'structural drawings']),
('Construction Estimator', 'construction-estimator', (SELECT id FROM industry_categories WHERE slug = 'engineering-construction-support'), 'high', 2500, true, ARRAY['estimating', 'takeoffs', 'cost estimation']),
('Quantity Takeoff Specialist', 'quantity-takeoff-specialist', (SELECT id FROM industry_categories WHERE slug = 'engineering-construction-support'), 'high', 2500, true, ARRAY['quantity takeoff', 'material takeoff', 'bluebeam']),
('Project Scheduler', 'project-scheduler', (SELECT id FROM industry_categories WHERE slug = 'engineering-construction-support'), 'high', 2500, true, ARRAY['scheduling', 'primavera', 'ms project', 'gantt']),
('As-Built Documentation Specialist', 'as-built-documentation-specialist', (SELECT id FROM industry_categories WHERE slug = 'engineering-construction-support'), 'high', 2500, true, ARRAY['as-builts', 'documentation', 'record drawings']),

-- Real Estate & Finance Support ($15) - NON-LICENSED ONLY
('Real Estate Virtual Assistant', 'real-estate-va', (SELECT id FROM industry_categories WHERE slug = 'real-estate-finance-support'), 'mid', 1500, true, ARRAY['real estate admin', 'mls', 'property management']),
('Transaction Coordinator', 'transaction-coordinator', (SELECT id FROM industry_categories WHERE slug = 'real-estate-finance-support'), 'mid', 1500, true, ARRAY['transaction coordination', 'escrow', 'closing']),
('Financial Admin Assistant', 'financial-admin-assistant', (SELECT id FROM industry_categories WHERE slug = 'real-estate-finance-support'), 'mid', 1500, true, ARRAY['financial admin', 'bookkeeping support', 'invoicing']),
('Bookkeeper', 'bookkeeper', (SELECT id FROM industry_categories WHERE slug = 'real-estate-finance-support'), 'mid', 1500, true, ARRAY['bookkeeping', 'quickbooks', 'accounts payable']),

-- Other Remote Services ($15)
('Community Manager', 'community-manager', (SELECT id FROM industry_categories WHERE slug = 'other-remote-services'), 'mid', 1500, true, ARRAY['community management', 'discord', 'facebook groups']),
('Social Media Content Creator', 'social-media-content-creator', (SELECT id FROM industry_categories WHERE slug = 'other-remote-services'), 'mid', 1500, true, ARRAY['content creation', 'social media', 'reels']),
('Podcast Producer', 'podcast-producer', (SELECT id FROM industry_categories WHERE slug = 'other-remote-services'), 'mid', 1500, true, ARRAY['podcast production', 'show notes', 'podcast management']),
('Online Event Producer', 'online-event-producer', (SELECT id FROM industry_categories WHERE slug = 'other-remote-services'), 'mid', 1500, true, ARRAY['webinars', 'virtual events', 'zoom production']),
('Presentation Coach', 'presentation-coach', (SELECT id FROM industry_categories WHERE slug = 'other-remote-services'), 'mid', 1500, true, ARRAY['public speaking', 'presentation skills', 'pitch coaching']);