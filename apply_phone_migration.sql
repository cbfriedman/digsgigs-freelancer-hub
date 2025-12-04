-- Add phone column to profiles table
-- This migration is safe to run multiple times due to IF NOT EXISTS clauses

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;


