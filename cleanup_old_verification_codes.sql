-- =====================================================
-- CLEANUP OLD VERIFICATION CODES
-- Run this in Supabase Dashboard > SQL Editor
-- This will remove expired and old verification codes
-- =====================================================

-- Delete all expired verification codes (older than 5 minutes)
DELETE FROM verification_codes
WHERE expires_at < NOW();

-- Delete all verified codes (no longer needed)
DELETE FROM verification_codes
WHERE verified = true;

-- Delete codes older than 1 hour (safety cleanup)
DELETE FROM verification_codes
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Optional: Show current counts by email (for debugging)
-- Uncomment to see how many codes each email has
/*
SELECT 
  email,
  COUNT(*) as total_codes,
  COUNT(*) FILTER (WHERE verified = true) as verified_codes,
  COUNT(*) FILTER (WHERE verified = false AND expires_at > NOW()) as active_unverified,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_codes
FROM verification_codes
GROUP BY email
ORDER BY total_codes DESC
LIMIT 20;
*/

-- Show summary
SELECT 
  COUNT(*) as total_codes_remaining,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(*) FILTER (WHERE verified = false AND expires_at > NOW()) as active_unverified_codes
FROM verification_codes;

