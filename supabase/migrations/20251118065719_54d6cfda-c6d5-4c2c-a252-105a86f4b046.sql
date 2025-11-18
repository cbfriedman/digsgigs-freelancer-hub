-- Update Therapists category name to Therapists and Personal Counseling
UPDATE public.categories
SET name = 'Therapists and Personal Counseling'
WHERE name = 'Therapists';