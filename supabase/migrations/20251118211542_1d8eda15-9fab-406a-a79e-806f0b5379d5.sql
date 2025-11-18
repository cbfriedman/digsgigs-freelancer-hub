-- Create table for digger lead balance (escrow account)
CREATE TABLE IF NOT EXISTS public.digger_lead_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_deposited NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  last_deposit_at TIMESTAMPTZ,
  last_warning_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(digger_id)
);

-- Enable RLS on digger_lead_balance
ALTER TABLE public.digger_lead_balance ENABLE ROW LEVEL SECURITY;

-- RLS policies for digger_lead_balance
CREATE POLICY "Diggers can view own balance"
  ON public.digger_lead_balance
  FOR SELECT
  USING (
    digger_id IN (
      SELECT id FROM public.digger_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Diggers can insert own balance"
  ON public.digger_lead_balance
  FOR INSERT
  WITH CHECK (
    digger_id IN (
      SELECT id FROM public.digger_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_digger_lead_balance_digger_id ON public.digger_lead_balance(digger_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_digger_lead_balance_updated_at
  BEFORE UPDATE ON public.digger_lead_balance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for lead balance transactions
CREATE TABLE IF NOT EXISTS public.lead_balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digger_id UUID NOT NULL REFERENCES public.digger_profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'deduction', 'refund')),
  description TEXT,
  lead_purchase_id UUID REFERENCES public.lead_purchases(id) ON DELETE SET NULL,
  stripe_payment_id TEXT,
  balance_after NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on lead_balance_transactions
ALTER TABLE public.lead_balance_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_balance_transactions
CREATE POLICY "Diggers can view own transactions"
  ON public.lead_balance_transactions
  FOR SELECT
  USING (
    digger_id IN (
      SELECT id FROM public.digger_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_balance_transactions_digger_id ON public.lead_balance_transactions(digger_id);
CREATE INDEX IF NOT EXISTS idx_lead_balance_transactions_created_at ON public.lead_balance_transactions(created_at DESC);