-- Drop existing insert policy and recreate with proper anonymous access
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;

-- Create policy that explicitly allows anonymous inserts (for public signup forms)
CREATE POLICY "Anyone can subscribe" 
ON public.subscribers 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);