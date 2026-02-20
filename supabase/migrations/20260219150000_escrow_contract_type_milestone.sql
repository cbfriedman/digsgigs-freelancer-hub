-- Allow contract_type 'milestone' for payment contracts (create-payment-contract)
ALTER TABLE public.escrow_contracts
DROP CONSTRAINT IF EXISTS escrow_contracts_contract_type_check;

ALTER TABLE public.escrow_contracts
ADD CONSTRAINT escrow_contracts_contract_type_check
CHECK (contract_type IN ('fixed', 'hourly', 'milestone'));
