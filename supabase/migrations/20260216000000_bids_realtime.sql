-- Enable Realtime for bids so giggers see new/updated proposals in real time
ALTER TABLE public.bids REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
