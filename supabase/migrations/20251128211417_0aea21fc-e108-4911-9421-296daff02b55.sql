-- Add consumer_email column to gigs table
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS consumer_email TEXT;