-- Add country column to digger_profiles table
ALTER TABLE digger_profiles 
ADD COLUMN IF NOT EXISTS country text DEFAULT 'United States';