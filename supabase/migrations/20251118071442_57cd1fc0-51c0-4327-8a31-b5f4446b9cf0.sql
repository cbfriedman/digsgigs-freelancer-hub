-- Rename 'architecture' to 'architects and engineers'
UPDATE public.categories
SET name = 'architects and engineers'
WHERE name = 'architecture' AND parent_category_id IS NULL;