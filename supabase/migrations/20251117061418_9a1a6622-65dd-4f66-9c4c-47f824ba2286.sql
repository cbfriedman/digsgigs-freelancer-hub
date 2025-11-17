-- Add Stripe Connect fields to digger_profiles
ALTER TABLE public.digger_profiles
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean DEFAULT false;

-- Create escrow_contracts table
CREATE TABLE IF NOT EXISTS public.escrow_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid REFERENCES public.gigs(id) NOT NULL,
  consumer_id uuid REFERENCES public.profiles(id) NOT NULL,
  digger_id uuid REFERENCES public.digger_profiles(id) NOT NULL,
  total_amount numeric NOT NULL,
  platform_fee_percentage numeric DEFAULT 5.0,
  platform_fee_amount numeric NOT NULL,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  funded_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Create milestone_payments table
CREATE TABLE IF NOT EXISTS public.milestone_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_contract_id uuid REFERENCES public.escrow_contracts(id) NOT NULL,
  milestone_number integer NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  digger_payout numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  released_at timestamp with time zone,
  stripe_transfer_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(escrow_contract_id, milestone_number)
);

-- Add escrow fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS escrow_contract_id uuid REFERENCES public.escrow_contracts(id),
ADD COLUMN IF NOT EXISTS is_escrow boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS milestone_payment_id uuid REFERENCES public.milestone_payments(id);

-- Enable RLS on escrow_contracts
ALTER TABLE public.escrow_contracts ENABLE ROW LEVEL SECURITY;

-- Policies for escrow_contracts
CREATE POLICY "Consumers can view their escrow contracts"
ON public.escrow_contracts FOR SELECT
USING (consumer_id = auth.uid());

CREATE POLICY "Diggers can view their escrow contracts"
ON public.escrow_contracts FOR SELECT
USING (digger_id IN (
  SELECT id FROM public.digger_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Consumers can create escrow contracts"
ON public.escrow_contracts FOR INSERT
WITH CHECK (consumer_id = auth.uid());

-- Enable RLS on milestone_payments
ALTER TABLE public.milestone_payments ENABLE ROW LEVEL SECURITY;

-- Policies for milestone_payments
CREATE POLICY "Contract participants can view milestones"
ON public.milestone_payments FOR SELECT
USING (
  escrow_contract_id IN (
    SELECT id FROM public.escrow_contracts 
    WHERE consumer_id = auth.uid() 
    OR digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Contract participants can create milestones"
ON public.milestone_payments FOR INSERT
WITH CHECK (
  escrow_contract_id IN (
    SELECT id FROM public.escrow_contracts 
    WHERE consumer_id = auth.uid() 
    OR digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Consumers can update milestone status"
ON public.milestone_payments FOR UPDATE
USING (
  escrow_contract_id IN (
    SELECT id FROM public.escrow_contracts WHERE consumer_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_escrow_contracts_gig_id ON public.escrow_contracts(gig_id);
CREATE INDEX IF NOT EXISTS idx_escrow_contracts_consumer_id ON public.escrow_contracts(consumer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_contracts_digger_id ON public.escrow_contracts(digger_id);
CREATE INDEX IF NOT EXISTS idx_milestone_payments_escrow_contract_id ON public.milestone_payments(escrow_contract_id);
CREATE INDEX IF NOT EXISTS idx_transactions_escrow_contract_id ON public.transactions(escrow_contract_id);