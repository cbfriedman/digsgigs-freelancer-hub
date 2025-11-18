-- Add Pet Services category with subcategories
DO $$
DECLARE
  pet_category_id UUID;
BEGIN
  -- Insert parent category
  INSERT INTO public.categories (name, description)
  VALUES ('Pet Services', 'Professional pet care and animal services')
  RETURNING id INTO pet_category_id;

  -- Insert subcategories
  INSERT INTO public.categories (name, description, parent_category_id)
  VALUES 
    ('Dog Training', 'Obedience training and behavioral coaching for dogs', pet_category_id),
    ('Pet Grooming', 'Bathing, haircuts, and grooming services for pets', pet_category_id),
    ('Pet Sitting', 'In-home pet care and supervision', pet_category_id),
    ('Veterinary Assistance', 'Veterinary support and animal health services', pet_category_id),
    ('Dog Walking', 'Daily dog walking and exercise services', pet_category_id),
    ('Pet Boarding', 'Overnight pet care and boarding facilities', pet_category_id),
    ('Aquarium Services', 'Fish tank maintenance and aquatic pet care', pet_category_id);
END $$;