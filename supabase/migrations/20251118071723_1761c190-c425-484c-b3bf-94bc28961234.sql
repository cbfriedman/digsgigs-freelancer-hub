-- Rename categories with correct names
UPDATE public.categories
SET name = 'Architects and Engineers'
WHERE name = 'Architecture' AND parent_category_id IS NULL;

UPDATE public.categories
SET name = 'Financial Services'
WHERE name = 'Brokers & Consultants' AND parent_category_id IS NULL;