-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true);

-- Create storage bucket for work photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-photos', 'work-photos', true);

-- RLS policies for profile images
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for work photos
CREATE POLICY "Anyone can view work photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-photos');

CREATE POLICY "Authenticated users can upload work photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'work-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own work photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'work-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own work photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'work-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);