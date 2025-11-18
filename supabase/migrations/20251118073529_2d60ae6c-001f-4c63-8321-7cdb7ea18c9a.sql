-- Enable realtime for categories table
ALTER TABLE public.categories REPLICA IDENTITY FULL;

-- Add categories table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;