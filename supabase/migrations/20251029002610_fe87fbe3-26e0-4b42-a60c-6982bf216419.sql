-- Add purchase count tracking to gigs
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;

-- Create lead issues table for reporting bad leads
CREATE TABLE IF NOT EXISTS public.lead_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_purchase_id UUID NOT NULL REFERENCES public.lead_purchases(id) ON DELETE CASCADE,
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('wrong_info', 'no_response', 'already_filled', 'duplicate', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on lead_issues
ALTER TABLE public.lead_issues ENABLE ROW LEVEL SECURITY;

-- Policies for lead_issues
CREATE POLICY "Diggers can view their own issues" ON public.lead_issues 
  FOR SELECT USING (
    digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Diggers can create issues" ON public.lead_issues 
  FOR INSERT WITH CHECK (
    digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Consumers can view issues for their gigs" ON public.lead_issues 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lead_purchases lp
      JOIN public.gigs g ON lp.gig_id = g.id
      WHERE lp.id = lead_purchase_id AND g.consumer_id = auth.uid()
    )
  );

CREATE POLICY "Consumers can update issues for their gigs" ON public.lead_issues 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lead_purchases lp
      JOIN public.gigs g ON lp.gig_id = g.id
      WHERE lp.id = lead_purchase_id AND g.consumer_id = auth.uid()
    )
  );

-- Create function to increment purchase count
CREATE OR REPLACE FUNCTION increment_gig_purchase_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.gigs
  SET purchase_count = purchase_count + 1
  WHERE id = NEW.gig_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to increment purchase count
DROP TRIGGER IF EXISTS increment_purchase_count_trigger ON public.lead_purchases;
CREATE TRIGGER increment_purchase_count_trigger
AFTER INSERT ON public.lead_purchases
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION increment_gig_purchase_count();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lead_issues_digger ON public.lead_issues(digger_id);
CREATE INDEX IF NOT EXISTS idx_lead_issues_purchase ON public.lead_issues(lead_purchase_id);
CREATE INDEX IF NOT EXISTS idx_gigs_status_purchase_count ON public.gigs(status, purchase_count);