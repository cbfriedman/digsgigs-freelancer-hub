-- Add Therapists parent category
INSERT INTO categories (name, description, parent_category_id)
VALUES ('Therapists', 'Mental health and therapy professionals', NULL);

-- Add subcategories for Therapists
INSERT INTO categories (name, description, parent_category_id)
SELECT 'Clinical Psychologist', 'Licensed clinical psychology services', id FROM categories WHERE name = 'Therapists' AND parent_category_id IS NULL;

INSERT INTO categories (name, description, parent_category_id)
SELECT 'Marriage and Family Therapist', 'Relationship and family counseling', id FROM categories WHERE name = 'Therapists' AND parent_category_id IS NULL;

INSERT INTO categories (name, description, parent_category_id)
SELECT 'Licensed Professional Counselor', 'Professional mental health counseling', id FROM categories WHERE name = 'Therapists' AND parent_category_id IS NULL;

INSERT INTO categories (name, description, parent_category_id)
SELECT 'Art Therapist', 'Creative arts therapy services', id FROM categories WHERE name = 'Therapists' AND parent_category_id IS NULL;

INSERT INTO categories (name, description, parent_category_id)
SELECT 'Occupational Therapist', 'Physical and occupational rehabilitation', id FROM categories WHERE name = 'Therapists' AND parent_category_id IS NULL;

INSERT INTO categories (name, description, parent_category_id)
SELECT 'Physical Therapist', 'Physical therapy and rehabilitation', id FROM categories WHERE name = 'Therapists' AND parent_category_id IS NULL;

-- Add Other parent category
INSERT INTO categories (name, description, parent_category_id)
VALUES ('Other', 'Other professional services not listed', NULL);

-- Add a generic subcategory for Other
INSERT INTO categories (name, description, parent_category_id)
SELECT 'Other Professional Services', 'Custom professional services', id FROM categories WHERE name = 'Other' AND parent_category_id IS NULL;