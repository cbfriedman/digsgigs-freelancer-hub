-- Add stripe_payment_intent_id to milestone_payments (charge from Gigger per milestone)
ALTER TABLE public.milestone_payments
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Allow Diggers to update their milestones from pending -> submitted only (idempotent)
DROP POLICY IF EXISTS "Diggers can submit milestone" ON public.milestone_payments;
CREATE POLICY "Diggers can submit milestone"
ON public.milestone_payments FOR UPDATE
USING (
  escrow_contract_id IN (
    SELECT id FROM public.escrow_contracts
    WHERE digger_id IN (SELECT id FROM public.digger_profiles WHERE user_id = auth.uid())
  )
  AND status = 'pending'
)
WITH CHECK (status = 'submitted');

COMMENT ON COLUMN public.milestone_payments.stripe_payment_intent_id IS 'Stripe PaymentIntent for the charge from Gigger (incl. 3% platform fee).';
