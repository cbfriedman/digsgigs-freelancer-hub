# Checkout Flow Fixes - Change Log

## Overview
This document tracks the checkout flow fixes being made on Lovable that modify edge functions and add a new database table.

## Changes Made

### 1. New Database Table: `lead_credits`

**Migration File:** `supabase/migrations/20251128172137_1e39f07e-94c4-4bb5-a1bd-0ef1fc342afe.sql`

**Purpose:** Track pre-purchased lead allowances/credits for bulk purchases.

**Schema:**
- `id` - UUID primary key
- `user_id` - References auth.users
- `digger_profile_id` - References digger_profiles
- `keyword` - TEXT (required)
- `industry` - TEXT (optional)
- `exclusivity_type` - TEXT (default: 'non-exclusive')
- `quantity_purchased` - INTEGER (required)
- `quantity_remaining` - INTEGER (required)
- `price_per_lead` - NUMERIC (required)
- `total_paid` - NUMERIC (required)
- `stripe_payment_id` - TEXT (optional)
- `stripe_session_id` - TEXT (optional)
- `created_at` - TIMESTAMPTZ
- `expires_at` - TIMESTAMPTZ (optional)

**Constraints:**
- `quantity_remaining >= 0 AND quantity_remaining <= quantity_purchased`
- `exclusivity_type IN ('non-exclusive', 'semi-exclusive', 'exclusive')`

**RLS Policies:**
- Users can view their own lead credits
- System can insert/update lead credits (via service role)

**Indexes:**
- `idx_lead_credits_user_profile` - On (user_id, digger_profile_id)
- `idx_lead_credits_keyword` - On keyword
- `idx_lead_credits_remaining` - On quantity_remaining WHERE quantity_remaining > 0

---

### 2. Modified Edge Functions

#### `create-bulk-lead-checkout` ⚠️
**Status:** Being modified for checkout flow fixes

**Current Functionality:**
- Creates Stripe checkout sessions for bulk lead purchases
- Calculates bulk discounts (10% on first $1000, 20% on excess)
- Handles keyword-based lead selections
- Sets metadata for webhook processing

**Changes Expected:**
- Improved checkout flow handling
- Better integration with `lead_credits` table
- Enhanced error handling
- Updated metadata structure

**Location:** `supabase/functions/create-bulk-lead-checkout/index.ts`

---

#### `stripe-webhook` ⚠️
**Status:** Being modified for checkout flow fixes

**Current Functionality:**
- Handles Stripe webhook events
- Processes withdrawal penalty payments
- Processes regular lead purchases
- Records purchases in `lead_purchases` table

**Changes Expected:**
- May consolidate lead credit webhook handling
- Improved webhook event processing
- Better error handling and logging
- Integration with `lead_credits` table

**Location:** `supabase/functions/stripe-webhook/index.ts`

**Note:** There's also a separate `stripe-webhook-lead-credits` function that currently handles lead credit purchases. The changes to `stripe-webhook` may consolidate this functionality.

---

## Related Functions

### `stripe-webhook-lead-credits`
**Status:** Existing function (may be consolidated)

**Current Functionality:**
- Handles `checkout.session.completed` events for keyword bulk purchases
- Validates that all selections are non-exclusive
- Creates `lead_credits` records for each selection
- Applies discounted pricing per lead

**Location:** `supabase/functions/stripe-webhook-lead-credits/index.ts`

---

## Migration Impact

### Database
- ✅ New table `lead_credits` added (migration exists)
- ✅ RLS policies configured
- ✅ Indexes created for performance

### Edge Functions
- ⚠️ `create-bulk-lead-checkout` - Modified (checkout flow fixes)
- ⚠️ `stripe-webhook` - Modified (checkout flow fixes)
- ℹ️ `stripe-webhook-lead-credits` - May be consolidated into main webhook

### Application Code
- Frontend checkout flow may need updates
- Success/cancel URLs may change
- Metadata structure may change

---

## Testing Checklist

After implementing changes:

- [ ] Test bulk lead checkout creation
- [ ] Test Stripe webhook processing for lead credits
- [ ] Verify `lead_credits` records are created correctly
- [ ] Verify discount calculations are correct
- [ ] Test error handling for invalid purchases
- [ ] Verify RLS policies work correctly
- [ ] Test credit consumption when leads are purchased
- [ ] Verify webhook signature validation
- [ ] Test edge cases (expired credits, insufficient credits, etc.)

---

## Deployment Notes

1. **Database Migration:**
   - The `lead_credits` table migration already exists
   - Run migration: `supabase db push` or apply migration file

2. **Edge Functions:**
   - Deploy updated `create-bulk-lead-checkout` function
   - Deploy updated `stripe-webhook` function
   - If consolidating, remove or deprecate `stripe-webhook-lead-credits`

3. **Stripe Configuration:**
   - Verify webhook endpoint is configured correctly
   - Test webhook events in Stripe dashboard
   - Ensure webhook secret is set in Supabase secrets

4. **Verification:**
   - Test complete checkout flow end-to-end
   - Verify credits are created and tracked correctly
   - Monitor function logs for errors

---

## Related Documentation

- **Migration Checklist:** See `MIGRATION_CHECKLIST.md`
- **Migration Inventory:** See `MIGRATION_INVENTORY.md`
- **Secrets Reference:** See `SECRETS_REFERENCE.md`

---

**Last Updated:** 2024-12-19  
**Status:** In Progress

