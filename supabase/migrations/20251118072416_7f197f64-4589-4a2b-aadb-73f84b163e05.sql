-- Rename "Architects and Engineers" category to "Architects"
UPDATE public.categories
SET name = 'Architects'
WHERE name = 'Architects and Engineers' AND parent_category_id IS NULL;