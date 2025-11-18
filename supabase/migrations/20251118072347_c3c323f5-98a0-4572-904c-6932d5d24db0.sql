-- Rename Engineering category to Engineers
UPDATE public.categories
SET name = 'Engineers'
WHERE name = 'Engineering' AND parent_category_id IS NULL;