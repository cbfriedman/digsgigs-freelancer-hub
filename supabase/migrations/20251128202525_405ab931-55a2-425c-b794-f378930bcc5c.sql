-- Fix infinite recursion in gigs RLS policies by dropping and recreating them correctly

-- Drop existing policies that may have circular dependencies
DROP POLICY IF EXISTS "Users can view their own gigs" ON gigs;
DROP POLICY IF EXISTS "Users can insert their own gigs" ON gigs;
DROP POLICY IF EXISTS "Users can update their own gigs" ON gigs;
DROP POLICY IF EXISTS "Users can delete their own gigs" ON gigs;
DROP POLICY IF EXISTS "Diggers can view gigs" ON gigs;
DROP POLICY IF EXISTS "Public can view open gigs" ON gigs;

-- Create simple, non-recursive policies
CREATE POLICY "Enable insert for authenticated users"
  ON gigs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = consumer_id);

CREATE POLICY "Enable read for authenticated users"
  ON gigs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for gig owners"
  ON gigs FOR UPDATE
  TO authenticated
  USING (auth.uid() = consumer_id)
  WITH CHECK (auth.uid() = consumer_id);

CREATE POLICY "Enable delete for gig owners"
  ON gigs FOR DELETE
  TO authenticated
  USING (auth.uid() = consumer_id);

-- Add documents array column to gigs table if it doesn't exist
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS documents TEXT[];

-- Create storage bucket for gig documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('gig-documents', 'gig-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gig documents
CREATE POLICY "Authenticated users can upload gig documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gig-documents');

CREATE POLICY "Users can view their own gig documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'gig-documents');

CREATE POLICY "Users can delete their own gig documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gig-documents');