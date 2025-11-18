-- Add Event Planning category with subcategories
DO $$
DECLARE
  event_category_id UUID;
BEGIN
  -- Insert parent category
  INSERT INTO public.categories (name, description)
  VALUES ('Event Planning', 'Professional event coordination and planning services')
  RETURNING id INTO event_category_id;

  -- Insert subcategories
  INSERT INTO public.categories (name, description, parent_category_id)
  VALUES 
    ('Wedding Planning', 'Wedding coordination and planning services', event_category_id),
    ('Corporate Events', 'Business meetings, conferences, and corporate gatherings', event_category_id),
    ('Party Planning', 'Birthday parties, celebrations, and social events', event_category_id),
    ('Catering Coordination', 'Food service planning and catering management', event_category_id),
    ('Event Design', 'Event styling, decor, and theme development', event_category_id),
    ('Event Photography', 'Professional photography for events', event_category_id),
    ('Entertainment Booking', 'DJ, band, and performer coordination', event_category_id);
END $$;