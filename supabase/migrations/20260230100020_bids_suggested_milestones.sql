-- Allow Digger to suggest a milestone plan; only Gigger can create the payment contract.
-- suggested_milestones: array of { description, amount } stored by Digger; Gigger can accept and create contract from it.

ALTER TABLE public.bids
ADD COLUMN IF NOT EXISTS suggested_milestones jsonb DEFAULT NULL;

COMMENT ON COLUMN public.bids.suggested_milestones IS 'Milestone plan suggested by the Digger: [{ description: string, amount: number }]. Only the gig owner can create the contract from this.';
