-- Add Automotive Services category with subcategories
DO $$
DECLARE
  auto_category_id UUID;
BEGIN
  -- Insert parent category
  INSERT INTO public.categories (name, description)
  VALUES ('Automotive Services', 'Professional automotive care and repair services')
  RETURNING id INTO auto_category_id;
  
  -- Insert subcategories
  INSERT INTO public.categories (name, description, parent_category_id)
  VALUES 
    ('Auto Repair', 'General automotive repair and maintenance services', auto_category_id),
    ('Detailing', 'Professional car cleaning and detailing services', auto_category_id),
    ('Mobile Mechanic', 'On-site automotive repair and maintenance', auto_category_id),
    ('Car Washing', 'Exterior and interior car washing services', auto_category_id),
    ('Oil Change', 'Quick oil change and fluid services', auto_category_id),
    ('Tire Services', 'Tire installation, rotation, and repair', auto_category_id),
    ('Auto Body Work', 'Dent repair, painting, and body restoration', auto_category_id);
END $$;