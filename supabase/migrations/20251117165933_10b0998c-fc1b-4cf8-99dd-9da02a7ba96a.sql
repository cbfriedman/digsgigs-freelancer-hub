-- Add contract type and hourly-specific fields to escrow_contracts
ALTER TABLE public.escrow_contracts
ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS hourly_rate numeric,
ADD COLUMN IF NOT EXISTS estimated_hours numeric,
ADD COLUMN IF NOT EXISTS actual_hours numeric DEFAULT 0;

-- Add check constraint for contract type
ALTER TABLE public.escrow_contracts
ADD CONSTRAINT escrow_contracts_contract_type_check 
CHECK (contract_type IN ('fixed', 'hourly'));

-- Update platform fee minimum to $10
COMMENT ON COLUMN public.escrow_contracts.platform_fee_amount IS 'Platform fee amount - minimum $10 per payment';

-- Add hourly tracking to milestone payments
ALTER TABLE public.milestone_payments
ADD COLUMN IF NOT EXISTS hours_worked numeric,
ADD COLUMN IF NOT EXISTS hourly_rate numeric;

-- Update the milestone_payments comment
COMMENT ON TABLE public.milestone_payments IS 'Progress payments for escrow contracts - supports both fixed and hourly contracts with 5% fee, $10 minimum per payment';