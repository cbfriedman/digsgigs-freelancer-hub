-- Add Education and Tutoring category with subcategories
DO $$
DECLARE
  education_category_id UUID;
BEGIN
  -- Insert parent category
  INSERT INTO public.categories (name, description)
  VALUES ('Education and Tutoring', 'Academic and skill-based educational services')
  RETURNING id INTO education_category_id;

  -- Insert subcategories
  INSERT INTO public.categories (name, description, parent_category_id)
  VALUES 
    ('Academic Tutoring', 'Subject-specific tutoring and homework help', education_category_id),
    ('Language Instruction', 'Foreign language teaching and ESL services', education_category_id),
    ('Music Lessons', 'Instrumental and vocal music instruction', education_category_id),
    ('Test Preparation', 'SAT, ACT, GRE, and other standardized test prep', education_category_id),
    ('Art Classes', 'Visual arts instruction and workshops', education_category_id),
    ('Dance Instruction', 'Dance classes and choreography', education_category_id),
    ('Computer Skills Training', 'Technology and software training', education_category_id);
END $$;