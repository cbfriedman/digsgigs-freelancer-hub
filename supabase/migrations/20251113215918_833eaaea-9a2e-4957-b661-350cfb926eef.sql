-- Add subscription tracking to digger_profiles
ALTER TABLE public.digger_profiles
ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled')),
ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Create bids table for the bidding system
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  timeline TEXT NOT NULL,
  proposal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gig_id, digger_id)
);

-- Enable RLS on bids
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- RLS policies for bids
CREATE POLICY "Diggers can create bids"
ON public.bids
FOR INSERT
TO authenticated
WITH CHECK (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Diggers can view own bids"
ON public.bids
FOR SELECT
TO authenticated
USING (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Diggers can update own bids"
ON public.bids
FOR UPDATE
TO authenticated
USING (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Gig owners can view bids on their gigs"
ON public.bids
FOR SELECT
TO authenticated
USING (gig_id IN (
  SELECT id FROM public.gigs WHERE consumer_id = auth.uid()
));

CREATE POLICY "Gig owners can update bid status"
ON public.bids
FOR UPDATE
TO authenticated
USING (gig_id IN (
  SELECT id FROM public.gigs WHERE consumer_id = auth.uid()
));

-- Create transactions table for commission tracking
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  commission_rate NUMERIC NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
  commission_amount NUMERIC NOT NULL CHECK (commission_amount >= 0),
  digger_payout NUMERIC NOT NULL CHECK (digger_payout >= 0),
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  OR consumer_id = auth.uid()
);

-- Update trigger for bids
CREATE TRIGGER update_bids_updated_at
BEFORE UPDATE ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_bids_gig_id ON public.bids(gig_id);
CREATE INDEX idx_bids_digger_id ON public.bids(digger_id);
CREATE INDEX idx_bids_status ON public.bids(status);
CREATE INDEX idx_transactions_digger_id ON public.transactions(digger_id);
CREATE INDEX idx_transactions_consumer_id ON public.transactions(consumer_id);