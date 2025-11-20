-- Enable realtime for lead_purchases table so diggers get instant notifications
ALTER TABLE public.lead_purchases REPLICA IDENTITY FULL;

-- Add publication for realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_purchases;