-- Remove unique constraint on user_id to allow multiple profiles per user
ALTER TABLE digger_profiles DROP CONSTRAINT IF EXISTS digger_profiles_user_id_key;

-- Add a profile name field to help users distinguish between their profiles
ALTER TABLE digger_profiles ADD COLUMN IF NOT EXISTS profile_name TEXT;

-- Add is_primary flag to mark the main profile
ALTER TABLE digger_profiles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_digger_profiles_user_id ON digger_profiles(user_id);

-- Update RLS policies to ensure users can manage all their profiles
DROP POLICY IF EXISTS "Diggers can insert own profile" ON digger_profiles;
CREATE POLICY "Diggers can insert own profiles" ON digger_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Diggers can update own profile" ON digger_profiles;
CREATE POLICY "Diggers can update own profiles" ON digger_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Allow users to delete their own profiles
DROP POLICY IF EXISTS "Diggers can delete own profiles" ON digger_profiles;
CREATE POLICY "Diggers can delete own profiles" ON digger_profiles
  FOR DELETE USING (user_id = auth.uid());