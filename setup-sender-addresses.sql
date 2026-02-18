-- Setup Script: 100 Sender Email Addresses for Cold Email Campaigns
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Create sender_addresses table
CREATE TABLE IF NOT EXISTS sender_addresses (
  id SERIAL PRIMARY KEY,
  email_address TEXT UNIQUE NOT NULL,
  daily_sent_count INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  total_sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS (no policies = anon/authenticated get no access; service_role bypasses RLS)
ALTER TABLE sender_addresses ENABLE ROW LEVEL SECURITY;

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sender_addresses_active ON sender_addresses(is_active, daily_sent_count);
CREATE INDEX IF NOT EXISTS idx_sender_addresses_email ON sender_addresses(email_address);

-- Step 4: Insert 100 email addresses (email001@digsandgigs.net through email100@digsandgigs.net)
INSERT INTO sender_addresses (email_address)
SELECT 'email' || LPAD(series::text, 3, '0') || '@digsandgigs.net' AS email_address
FROM generate_series(1, 100) AS series
ON CONFLICT (email_address) DO NOTHING;

-- Step 5: Verify insertion (should show 100 rows)
SELECT COUNT(*) as total_addresses FROM sender_addresses;

-- Step 6: View sample addresses
SELECT id, email_address, daily_sent_count, is_active 
FROM sender_addresses 
ORDER BY id 
LIMIT 10;

-- Step 7: Create function to get next available sender address
-- (Returns address with lowest daily_sent_count that is active and under 50 limit)
CREATE OR REPLACE FUNCTION get_next_sender_address()
RETURNS TEXT AS $$
DECLARE
  next_address TEXT;
BEGIN
  SELECT email_address INTO next_address
  FROM sender_addresses
  WHERE is_active = true
    AND daily_sent_count < 50
    AND last_reset_date = CURRENT_DATE
  ORDER BY daily_sent_count ASC, id ASC
  LIMIT 1;
  
  -- If all addresses have reached 50 today, check if any need reset
  IF next_address IS NULL THEN
    -- Try to find any address (might need reset)
    SELECT email_address INTO next_address
    FROM sender_addresses
    WHERE is_active = true
      AND (last_reset_date < CURRENT_DATE OR daily_sent_count < 50)
    ORDER BY 
      CASE WHEN last_reset_date < CURRENT_DATE THEN 0 ELSE 1 END,
      daily_sent_count ASC,
      id ASC
    LIMIT 1;
  END IF;
  
  RETURN next_address;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to increment sender count after sending
CREATE OR REPLACE FUNCTION increment_sender_count(sender_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE sender_addresses
  SET 
    daily_sent_count = CASE 
      WHEN last_reset_date < CURRENT_DATE THEN 1  -- Reset if new day
      ELSE daily_sent_count + 1 
    END,
    last_reset_date = CURRENT_DATE,
    total_sent_count = total_sent_count + 1,
    updated_at = NOW()
  WHERE email_address = sender_email;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to reset daily counts (run daily at midnight)
CREATE OR REPLACE FUNCTION reset_daily_email_counts()
RETURNS void AS $$
BEGIN
  UPDATE sender_addresses
  SET 
    daily_sent_count = 0,
    last_reset_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create view for monitoring sender status
-- Use security_invoker so the view uses the querying user's permissions (not definer).
CREATE OR REPLACE VIEW sender_addresses_status WITH (security_invoker = true) AS
SELECT 
  id,
  email_address,
  daily_sent_count,
  CASE 
    WHEN daily_sent_count >= 50 THEN 'Daily Limit Reached'
    WHEN last_reset_date < CURRENT_DATE THEN 'Needs Reset'
    ELSE 'Available'
  END AS status,
  last_reset_date,
  total_sent_count,
  is_active,
  created_at
FROM sender_addresses
ORDER BY daily_sent_count DESC, id ASC;

-- Step 11: Test the get_next_sender_address function
SELECT get_next_sender_address() AS next_available_address;

-- Step 12: Test increment function (optional - uncomment to test)
-- SELECT increment_sender_count('email001@digsandgigs.net');
-- SELECT * FROM sender_addresses WHERE email_address = 'email001@digsandgigs.net';

-- Step 13: View current status (all addresses)
SELECT * FROM sender_addresses_status LIMIT 20;

-- Summary:
-- ✅ Table created: sender_addresses
-- ✅ 100 email addresses inserted
-- ✅ Helper functions created:
--    - get_next_sender_address() - Get next available address
--    - increment_sender_count(email) - Increment after sending
--    - reset_daily_email_counts() - Reset daily counts (run at midnight)
-- ✅ Monitoring view created: sender_addresses_status

