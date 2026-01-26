-- Migration: Update referral fee rate from 2% to 8% to match code changes
-- This updates the default values for new records and existing uncharged records

-- Update default value for bids.referral_fee_rate from 0.02 (2%) to 0.08 (8%)
ALTER TABLE public.bids 
ALTER COLUMN referral_fee_rate SET DEFAULT 0.08;

-- Update existing bids that haven't been charged yet (referral_fee_charged_at IS NULL)
-- Only update if they still have the old default value (0.02 or 0.03)
UPDATE public.bids 
SET referral_fee_rate = 0.08
WHERE referral_fee_charged_at IS NULL 
  AND referral_fee_rate IN (0.02, 0.03);

-- Update default value for referral_payments.fee_rate from 0.02 (2%) to 0.08 (8%)
ALTER TABLE public.referral_payments 
ALTER COLUMN fee_rate SET DEFAULT 0.08;

-- Update existing referral_payments that are still pending (status = 'pending')
-- Only update if they still have the old default value (0.02 or 0.03)
UPDATE public.referral_payments 
SET fee_rate = 0.08
WHERE status = 'pending' 
  AND fee_rate IN (0.02, 0.03);

-- Add comment to document the change
COMMENT ON COLUMN public.bids.referral_fee_rate IS 'Referral fee rate as decimal (0.08 = 8%). Updated from 2% to 8% on 2026-01-26. Existing charged fees remain at their original rate.';
COMMENT ON COLUMN public.referral_payments.fee_rate IS 'Referral fee rate as decimal (0.08 = 8%). Updated from 2% to 8% on 2026-01-26. Existing charged fees remain at their original rate.';
