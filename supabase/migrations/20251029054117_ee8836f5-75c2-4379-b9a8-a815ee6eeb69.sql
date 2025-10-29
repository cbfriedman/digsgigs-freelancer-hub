-- Add licensed status to digger_profiles
ALTER TABLE public.digger_profiles
ADD COLUMN is_licensed text CHECK (is_licensed IN ('yes', 'no', 'not_required')) DEFAULT 'not_required';

-- Create table to track reference contact requests
CREATE TABLE public.reference_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.references(id) ON DELETE CASCADE,
  consumer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digger_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  UNIQUE(reference_id, consumer_id)
);

-- Enable RLS
ALTER TABLE public.reference_contact_requests ENABLE ROW LEVEL SECURITY;

-- Consumers can create requests
CREATE POLICY "Consumers can request reference contacts"
ON public.reference_contact_requests
FOR INSERT
WITH CHECK (consumer_id = auth.uid());

-- Consumers can view their own requests
CREATE POLICY "Consumers can view own requests"
ON public.reference_contact_requests
FOR SELECT
USING (consumer_id = auth.uid());

-- Diggers can view requests for their references
CREATE POLICY "Diggers can view requests for their references"
ON public.reference_contact_requests
FOR SELECT
USING (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

-- Diggers can update requests for their references
CREATE POLICY "Diggers can respond to requests"
ON public.reference_contact_requests
FOR UPDATE
USING (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

-- Add index for performance
CREATE INDEX idx_reference_requests_digger ON public.reference_contact_requests(digger_id);
CREATE INDEX idx_reference_requests_consumer ON public.reference_contact_requests(consumer_id);