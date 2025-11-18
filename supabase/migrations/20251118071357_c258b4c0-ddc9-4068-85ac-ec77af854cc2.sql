-- Rename 'Brokers and consultants' to 'Financial services'
UPDATE public.categories
SET name = 'Financial services'
WHERE name = 'Brokers and consultants' AND parent_category_id IS NULL;