-- Unique constraint on digger_profiles.handle for username-based URLs
-- Allows multiple NULLs (existing profiles without handle)
-- Case-insensitive: we use lower(handle) for uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_digger_profiles_handle_unique 
  ON public.digger_profiles (lower(handle)) 
  WHERE handle IS NOT NULL AND trim(handle) != '';

COMMENT ON COLUMN public.digger_profiles.handle IS 'Unique username for profile URL (e.g. jackson325). Stored without @. Used in /digger/:username';
