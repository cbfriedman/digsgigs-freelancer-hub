-- Add Brokers & Consultants parent category
INSERT INTO categories (name, description, parent_category_id)
VALUES ('Brokers & Consultants', 'Financial and business brokerage services', NULL)
ON CONFLICT DO NOTHING;

-- Get the parent category ID for subcategories
DO $$
DECLARE
  parent_id uuid;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE name = 'Brokers & Consultants' AND parent_category_id IS NULL;
  
  -- Insert broker subcategories
  INSERT INTO categories (name, description, parent_category_id) VALUES
    ('Consumer Loan Brokers', 'Consumer lending and loan brokerage services', parent_id),
    ('Business Purpose Loan Brokers', 'Commercial and business loan brokerage', parent_id),
    ('Mortgage Brokers', 'Residential and commercial mortgage services', parent_id),
    ('Real Estate Brokers', 'Property buying, selling, and leasing services', parent_id),
    ('Business Brokers', 'Business acquisition and sale services', parent_id),
    ('Insurance Brokers', 'Insurance coverage and policy services', parent_id),
    ('Stock Brokers', 'Securities and equity trading services', parent_id),
    ('Commodity Brokers', 'Commodity trading and futures services', parent_id),
    ('Financial Consultants', 'Financial planning and advisory services', parent_id),
    ('Business Consultants', 'Business strategy and management consulting', parent_id)
  ON CONFLICT DO NOTHING;
END $$;