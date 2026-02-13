-- Enable realtime for gigs so browse-gigs page can show new projects without refresh
ALTER TABLE public.gigs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gigs;
