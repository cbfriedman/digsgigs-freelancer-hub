-- Add Fitness and Nutrition category with subcategories
DO $$
DECLARE
  fitness_category_id UUID;
BEGIN
  -- Insert parent category
  INSERT INTO public.categories (name, description)
  VALUES ('Fitness and Nutrition', 'Health, fitness training, and nutritional services')
  RETURNING id INTO fitness_category_id;

  -- Insert subcategories
  INSERT INTO public.categories (name, description, parent_category_id)
  VALUES 
    ('Personal Training', 'One-on-one and group fitness training', fitness_category_id),
    ('Nutrition Consulting', 'Dietary planning and nutritional advice', fitness_category_id),
    ('Yoga Instruction', 'Yoga classes and instruction', fitness_category_id),
    ('Pilates Instruction', 'Pilates classes and training', fitness_category_id),
    ('Sports Coaching', 'Specialized sports training and coaching', fitness_category_id),
    ('Weight Management', 'Weight loss and weight management programs', fitness_category_id),
    ('Athletic Training', 'Sports performance and injury prevention', fitness_category_id);
END $$;