-- Seed skill categories and skills (Upwork/Freelancer-style, platform-wide)
-- Categories and skills for software dev, design, marketing, PM, automation, etc.

-- Skill categories
INSERT INTO public.skill_categories (id, name, slug, display_order) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Web & Mobile Development', 'web-mobile-development', 1),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Design & Creative', 'design-creative', 2),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Marketing & Sales', 'marketing-sales', 3),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Writing & Content', 'writing-content', 4),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Admin & Support', 'admin-support', 5),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Project Management', 'project-management', 6),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'DevOps & Cloud', 'devops-cloud', 7),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'Data & Analytics', 'data-analytics', 8),
  ('a1b2c3d4-0009-4000-8000-000000000009', 'Automation', 'automation', 9)
ON CONFLICT (slug) DO NOTHING;

-- Skills per category. ON CONFLICT (name) DO NOTHING for idempotent migrations.

-- Web & Mobile Development
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('HTML', 'html', 'a1b2c3d4-0001-4000-8000-000000000001', 1),
  ('CSS', 'css', 'a1b2c3d4-0001-4000-8000-000000000001', 2),
  ('JavaScript', 'javascript', 'a1b2c3d4-0001-4000-8000-000000000001', 3),
  ('TypeScript', 'typescript', 'a1b2c3d4-0001-4000-8000-000000000001', 4),
  ('React', 'react', 'a1b2c3d4-0001-4000-8000-000000000001', 5),
  ('Next.js', 'nextjs', 'a1b2c3d4-0001-4000-8000-000000000001', 6),
  ('Vue.js', 'vuejs', 'a1b2c3d4-0001-4000-8000-000000000001', 7),
  ('Angular', 'angular', 'a1b2c3d4-0001-4000-8000-000000000001', 8),
  ('Svelte', 'svelte', 'a1b2c3d4-0001-4000-8000-000000000001', 9),
  ('jQuery', 'jquery', 'a1b2c3d4-0001-4000-8000-000000000001', 10),
  ('Tailwind CSS', 'tailwind-css', 'a1b2c3d4-0001-4000-8000-000000000001', 11),
  ('Bootstrap', 'bootstrap', 'a1b2c3d4-0001-4000-8000-000000000001', 12),
  ('Node.js', 'nodejs', 'a1b2c3d4-0001-4000-8000-000000000001', 13),
  ('Express.js', 'expressjs', 'a1b2c3d4-0001-4000-8000-000000000001', 14),
  ('PHP', 'php', 'a1b2c3d4-0001-4000-8000-000000000001', 15),
  ('Laravel', 'laravel', 'a1b2c3d4-0001-4000-8000-000000000001', 16),
  ('Python', 'python', 'a1b2c3d4-0001-4000-8000-000000000001', 17),
  ('Django', 'django', 'a1b2c3d4-0001-4000-8000-000000000001', 18),
  ('Flask', 'flask', 'a1b2c3d4-0001-4000-8000-000000000001', 19),
  ('Ruby on Rails', 'ruby-on-rails', 'a1b2c3d4-0001-4000-8000-000000000001', 20),
  ('.NET', 'dotnet', 'a1b2c3d4-0001-4000-8000-000000000001', 21),
  ('ASP.NET', 'aspnet', 'a1b2c3d4-0001-4000-8000-000000000001', 22),
  ('Java', 'java', 'a1b2c3d4-0001-4000-8000-000000000001', 23),
  ('Spring Boot', 'spring-boot', 'a1b2c3d4-0001-4000-8000-000000000001', 24),
  ('Go (Golang)', 'golang', 'a1b2c3d4-0001-4000-8000-000000000001', 25),
  ('REST API', 'rest-api', 'a1b2c3d4-0001-4000-8000-000000000001', 26),
  ('GraphQL', 'graphql', 'a1b2c3d4-0001-4000-8000-000000000001', 27),
  ('API integration', 'api-integration', 'a1b2c3d4-0001-4000-8000-000000000001', 28),
  ('WordPress', 'wordpress', 'a1b2c3d4-0001-4000-8000-000000000001', 29),
  ('Web design', 'web-design', 'a1b2c3d4-0001-4000-8000-000000000001', 30),
  ('Mobile app development', 'mobile-app-development', 'a1b2c3d4-0001-4000-8000-000000000001', 31),
  ('React Native', 'react-native', 'a1b2c3d4-0001-4000-8000-000000000001', 32),
  ('Flutter', 'flutter', 'a1b2c3d4-0001-4000-8000-000000000001', 33),
  ('Swift', 'swift', 'a1b2c3d4-0001-4000-8000-000000000001', 34),
  ('Kotlin', 'kotlin', 'a1b2c3d4-0001-4000-8000-000000000001', 35),
  ('E-commerce', 'ecommerce', 'a1b2c3d4-0001-4000-8000-000000000001', 36),
  ('Landing pages', 'landing-pages', 'a1b2c3d4-0001-4000-8000-000000000001', 37)
ON CONFLICT (name) DO NOTHING;

-- Design & Creative
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('UI/UX design', 'ui-ux-design', 'a1b2c3d4-0002-4000-8000-000000000002', 1),
  ('Figma', 'figma', 'a1b2c3d4-0002-4000-8000-000000000002', 2),
  ('Adobe XD', 'adobe-xd', 'a1b2c3d4-0002-4000-8000-000000000002', 3),
  ('Sketch', 'sketch', 'a1b2c3d4-0002-4000-8000-000000000002', 4),
  ('Photoshop', 'photoshop', 'a1b2c3d4-0002-4000-8000-000000000002', 5),
  ('Illustrator', 'illustrator', 'a1b2c3d4-0002-4000-8000-000000000002', 6),
  ('Graphic design', 'graphic-design', 'a1b2c3d4-0002-4000-8000-000000000002', 7),
  ('Logo design', 'logo-design', 'a1b2c3d4-0002-4000-8000-000000000002', 8),
  ('Branding', 'branding', 'a1b2c3d4-0002-4000-8000-000000000002', 9),
  ('Illustration', 'illustration', 'a1b2c3d4-0002-4000-8000-000000000002', 10),
  ('Photo editing', 'photo-editing', 'a1b2c3d4-0002-4000-8000-000000000002', 11),
  ('Video editing', 'video-editing', 'a1b2c3d4-0002-4000-8000-000000000002', 12),
  ('Motion graphics', 'motion-graphics', 'a1b2c3d4-0002-4000-8000-000000000002', 13),
  ('Prototyping', 'prototyping', 'a1b2c3d4-0002-4000-8000-000000000002', 14),
  ('Wireframing', 'wireframing', 'a1b2c3d4-0002-4000-8000-000000000002', 15),
  ('Presentation design', 'presentation-design', 'a1b2c3d4-0002-4000-8000-000000000002', 16)
ON CONFLICT (name) DO NOTHING;

-- Marketing & Sales
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('SEO', 'seo', 'a1b2c3d4-0003-4000-8000-000000000003', 1),
  ('SEM', 'sem', 'a1b2c3d4-0003-4000-8000-000000000003', 2),
  ('Google Ads', 'google-ads', 'a1b2c3d4-0003-4000-8000-000000000003', 3),
  ('Facebook Ads', 'facebook-ads', 'a1b2c3d4-0003-4000-8000-000000000003', 4),
  ('Social media marketing', 'social-media-marketing', 'a1b2c3d4-0003-4000-8000-000000000003', 5),
  ('Social media', 'social-media', 'a1b2c3d4-0003-4000-8000-000000000003', 6),
  ('Content marketing', 'content-marketing', 'a1b2c3d4-0003-4000-8000-000000000003', 7),
  ('Email marketing', 'email-marketing', 'a1b2c3d4-0003-4000-8000-000000000003', 8),
  ('Digital marketing', 'digital-marketing', 'a1b2c3d4-0003-4000-8000-000000000003', 9),
  ('Marketing automation', 'marketing-automation', 'a1b2c3d4-0003-4000-8000-000000000003', 10),
  ('Conversion optimization', 'conversion-optimization', 'a1b2c3d4-0003-4000-8000-000000000003', 11),
  ('Analytics', 'analytics', 'a1b2c3d4-0003-4000-8000-000000000003', 12),
  ('Sales', 'sales', 'a1b2c3d4-0003-4000-8000-000000000003', 13)
ON CONFLICT (name) DO NOTHING;

-- Writing & Content
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('Copywriting', 'copywriting', 'a1b2c3d4-0004-4000-8000-000000000004', 1),
  ('Content writing', 'content-writing', 'a1b2c3d4-0004-4000-8000-000000000004', 2),
  ('Technical writing', 'technical-writing', 'a1b2c3d4-0004-4000-8000-000000000004', 3),
  ('Blog writing', 'blog-writing', 'a1b2c3d4-0004-4000-8000-000000000004', 4),
  ('Grant writing', 'grant-writing', 'a1b2c3d4-0004-4000-8000-000000000004', 5),
  ('Proofreading', 'proofreading', 'a1b2c3d4-0004-4000-8000-000000000004', 6),
  ('Editing', 'editing', 'a1b2c3d4-0004-4000-8000-000000000004', 7)
ON CONFLICT (name) DO NOTHING;

-- Admin & Support
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('Virtual assistant', 'virtual-assistant', 'a1b2c3d4-0005-4000-8000-000000000005', 1),
  ('Data entry', 'data-entry', 'a1b2c3d4-0005-4000-8000-000000000005', 2),
  ('Excel', 'excel', 'a1b2c3d4-0005-4000-8000-000000000005', 3),
  ('CRM setup', 'crm-setup', 'a1b2c3d4-0005-4000-8000-000000000005', 4),
  ('CRM', 'crm', 'a1b2c3d4-0005-4000-8000-000000000005', 5),
  ('Salesforce', 'salesforce', 'a1b2c3d4-0005-4000-8000-000000000005', 6),
  ('Customer service', 'customer-service', 'a1b2c3d4-0005-4000-8000-000000000005', 7),
  ('Zendesk', 'zendesk', 'a1b2c3d4-0005-4000-8000-000000000005', 8),
  ('Administrative support', 'administrative-support', 'a1b2c3d4-0005-4000-8000-000000000005', 9)
ON CONFLICT (name) DO NOTHING;

-- Project Management
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('Project management', 'project-management', 'a1b2c3d4-0006-4000-8000-000000000006', 1),
  ('Agile', 'agile', 'a1b2c3d4-0006-4000-8000-000000000006', 2),
  ('Scrum', 'scrum', 'a1b2c3d4-0006-4000-8000-000000000006', 3),
  ('Jira', 'jira', 'a1b2c3d4-0006-4000-8000-000000000006', 4),
  ('Asana', 'asana', 'a1b2c3d4-0006-4000-8000-000000000006', 5),
  ('Trello', 'trello', 'a1b2c3d4-0006-4000-8000-000000000006', 6),
  ('PMP', 'pmp', 'a1b2c3d4-0006-4000-8000-000000000006', 7),
  ('Project planning', 'project-planning', 'a1b2c3d4-0006-4000-8000-000000000006', 8),
  ('Product management', 'product-management', 'a1b2c3d4-0006-4000-8000-000000000006', 9)
ON CONFLICT (name) DO NOTHING;

-- DevOps & Cloud
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('Docker', 'docker', 'a1b2c3d4-0007-4000-8000-000000000007', 1),
  ('Kubernetes', 'kubernetes', 'a1b2c3d4-0007-4000-8000-000000000007', 2),
  ('CI/CD', 'cicd', 'a1b2c3d4-0007-4000-8000-000000000007', 3),
  ('Git', 'git', 'a1b2c3d4-0007-4000-8000-000000000007', 4),
  ('AWS', 'aws', 'a1b2c3d4-0007-4000-8000-000000000007', 5),
  ('Azure', 'azure', 'a1b2c3d4-0007-4000-8000-000000000007', 6),
  ('Google Cloud', 'google-cloud', 'a1b2c3d4-0007-4000-8000-000000000007', 7),
  ('Linux', 'linux', 'a1b2c3d4-0007-4000-8000-000000000007', 8),
  ('Database', 'database', 'a1b2c3d4-0007-4000-8000-000000000007', 9),
  ('PostgreSQL', 'postgresql', 'a1b2c3d4-0007-4000-8000-000000000007', 10),
  ('MySQL', 'mysql', 'a1b2c3d4-0007-4000-8000-000000000007', 11),
  ('MongoDB', 'mongodb', 'a1b2c3d4-0007-4000-8000-000000000007', 12),
  ('Redis', 'redis', 'a1b2c3d4-0007-4000-8000-000000000007', 13)
ON CONFLICT (name) DO NOTHING;

-- Data & Analytics
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('Data analysis', 'data-analysis', 'a1b2c3d4-0008-4000-8000-000000000008', 1),
  ('Data visualization', 'data-visualization', 'a1b2c3d4-0008-4000-8000-000000000008', 2),
  ('Machine learning', 'machine-learning', 'a1b2c3d4-0008-4000-8000-000000000008', 3),
  ('Data engineering', 'data-engineering', 'a1b2c3d4-0008-4000-8000-000000000008', 4),
  ('SQL', 'sql', 'a1b2c3d4-0008-4000-8000-000000000008', 5),
  ('Power BI', 'power-bi', 'a1b2c3d4-0008-4000-8000-000000000008', 6),
  ('Tableau', 'tableau', 'a1b2c3d4-0008-4000-8000-000000000008', 7)
ON CONFLICT (name) DO NOTHING;

-- Automation
INSERT INTO public.skills (name, slug, skill_category_id, display_order)
VALUES
  ('Automation', 'automation', 'a1b2c3d4-0009-4000-8000-000000000009', 1),
  ('Zapier', 'zapier', 'a1b2c3d4-0009-4000-8000-000000000009', 2),
  ('Make (Integromat)', 'make-integromat', 'a1b2c3d4-0009-4000-8000-000000000009', 3),
  ('RPA', 'rpa', 'a1b2c3d4-0009-4000-8000-000000000009', 4),
  ('Chatbot', 'chatbot', 'a1b2c3d4-0009-4000-8000-000000000009', 5),
  ('Python scripting', 'python-scripting', 'a1b2c3d4-0009-4000-8000-000000000009', 6)
ON CONFLICT (name) DO NOTHING;
