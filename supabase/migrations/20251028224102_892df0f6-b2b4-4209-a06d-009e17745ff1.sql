-- Remove monthly_inquiries from digger_profiles as it's no longer needed
ALTER TABLE public.digger_profiles DROP COLUMN IF EXISTS monthly_inquiries;

-- Create lead_purchases table to track which leads diggers have purchased
CREATE TABLE public.lead_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL,
  purchase_price NUMERIC NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(digger_id, gig_id)
);

-- Enable RLS on lead_purchases
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

-- Diggers can view their own purchases
CREATE POLICY "Diggers can view own purchases"
ON public.lead_purchases
FOR SELECT
USING (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

-- Diggers can insert their own purchases
CREATE POLICY "Diggers can create purchases"
ON public.lead_purchases
FOR INSERT
WITH CHECK (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

-- Add index for faster lookups
CREATE INDEX idx_lead_purchases_digger_gig ON public.lead_purchases(digger_id, gig_id);
CREATE INDEX idx_lead_purchases_gig ON public.lead_purchases(gig_id);

-- Create function to calculate lead price
CREATE OR REPLACE FUNCTION public.calculate_lead_price(gig_budget_min NUMERIC, gig_budget_max NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  calculated_price NUMERIC;
BEGIN
  -- If no budget is set, return minimum
  IF gig_budget_min IS NULL OR gig_budget_min = 0 THEN
    RETURN 50;
  END IF;
  
  -- Calculate 0.5% of lower budget range
  calculated_price := gig_budget_min * 0.005;
  
  -- Return the higher of $50 or 0.5% of budget
  RETURN GREATEST(50, calculated_price);
END;
$$;