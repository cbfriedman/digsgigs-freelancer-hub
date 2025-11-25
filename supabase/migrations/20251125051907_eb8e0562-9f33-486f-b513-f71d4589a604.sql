-- Create custom_categories table for user-specific categories
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_categories
CREATE POLICY "Users can view their own custom categories"
ON public.custom_categories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom categories"
ON public.custom_categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom categories"
ON public.custom_categories
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom categories"
ON public.custom_categories
FOR DELETE
USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate category names per user
CREATE UNIQUE INDEX custom_categories_user_name_unique 
ON public.custom_categories(user_id, LOWER(name));

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_custom_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_categories_updated_at
BEFORE UPDATE ON public.custom_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_custom_categories_updated_at();