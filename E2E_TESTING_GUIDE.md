# End-to-End Testing Guide

## Overview
This guide walks through testing the complete user journey from gig posting to transaction completion, verifying all payment flows and email notifications.

## Automated Test Suite

Navigate to `/e2e-test` to access the automated testing dashboard that validates:
- ✅ Authentication system
- ✅ Gig creation with AI matching
- ✅ In-app notifications
- ✅ Email notifications via Resend
- ✅ Stripe payment flows
- ✅ Messaging system
- ✅ Transaction processing

## Prerequisites

### 1. Test Accounts
Create two test accounts:
- **Consumer Account**: For posting gigs
- **Digger Account**: For receiving notifications and purchasing leads

### 2. Digger Profile Setup
The digger account must have:
- Complete profile with SIC/NAICS codes (e.g., `1521`, `236118` for construction)
- Business name, phone, location
- Hourly rate set (optional but recommended for testing lead pricing)

### 3. Stripe Configuration
- Stripe test mode enabled
- Use test card: `4242 4242 4242 4242` (any future date, any CVC)
- Other test cards: https://stripe.com/docs/testing#cards

### 4. Resend Email Configuration
- Domain verified at https://resend.com/domains
- API key configured (already set in secrets)
- Check https://resend.com/emails for sent emails

## Manual Testing Workflow

### Phase 1: Consumer Journey

#### Step 1: Create Consumer Account
1. Navigate to `/auth`
2. Sign up with email/password
3. Select "Consumer" as user type
4. Verify email redirect works
5. Check that profile is created in database

**Verification:**
```sql
SELECT * FROM profiles WHERE email = 'your-test-email@example.com';
```

#### Step 2: Post a Gig
1. Navigate to `/post-gig`
2. Fill in gig details:
   - Title: "Kitchen Renovation Project"
   - Description: Include keywords like "cabinets", "countertops", "plumbing"
   - Location: Any US address
   - Budget: $5,000 - $10,000
   - Category: Select appropriate category
3. Submit gig
4. Check `/test-ai-matching` to see AI-matched codes

**Verification:**
```sql
-- Check gig was created
SELECT id, title, ai_matched_codes, sic_codes, naics_codes 
FROM gigs 
ORDER BY created_at DESC 
LIMIT 1;

-- Check notifications were sent
SELECT n.*, p.email 
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.type = 'new_gig'
AND n.created_at > NOW() - INTERVAL '5 minutes';
```

**Expected Results:**
- Gig created with `ai_matched_codes = true`
- `sic_codes` and `naics_codes` arrays populated
- Notifications sent to diggers with matching codes

#### Step 3: Review Bids
1. Navigate to `/my-gigs`
2. Click on your posted gig
3. Wait for diggers to submit bids
4. Review bid proposals

**Verification:**
```sql
SELECT b.*, dp.business_name
FROM bids b
JOIN digger_profiles dp ON b.digger_id = dp.id
WHERE b.gig_id = 'your-gig-id';
```

#### Step 4: Accept Bid
1. Click "Accept" on a bid
2. Verify bid status changes to "accepted"
3. Check that digger receives notification
4. Verify email notification sent

**Verification:**
```sql
-- Check bid status
SELECT * FROM bids WHERE id = 'bid-id';

-- Check notification
SELECT * FROM notifications 
WHERE type = 'bid_status' 
AND metadata->>'bid_id' = 'bid-id';
```

### Phase 2: Digger Journey

#### Step 1: Create Digger Account
1. Navigate to `/auth`
2. Sign up with different email
3. Select "Digger" as user type
4. Complete registration at `/digger-registration`:
   - Add business name
   - Set profession (e.g., "General Contractor")
   - Add SIC code: `1521` (General Building Contractors)
   - Add NAICS code: `236118` (Residential Remodelers)
   - Set location
   - Add hourly rate

**Verification:**
```sql
SELECT dp.*, p.email
FROM digger_profiles dp
JOIN profiles p ON dp.user_id = p.id
WHERE p.email = 'digger-test@example.com';
```

#### Step 2: Receive Notification
1. Navigate to `/notifications`
2. Verify notification about new matching gig appears
3. Check email inbox for notification

**Verification:**
```sql
SELECT n.*, g.title
FROM notifications n
JOIN gigs g ON (n.metadata->>'gig_id')::uuid = g.id
WHERE n.user_id = 'digger-user-id'
AND n.type = 'new_gig'
ORDER BY n.created_at DESC;
```

**Email Verification:**
- Check Resend dashboard: https://resend.com/emails
- Verify email was sent to digger's email address

#### Step 3: Purchase Lead
1. Navigate to `/browse-gigs`
2. Find the matching gig
3. Click "Purchase Lead" or "Get Contact Info"
4. Complete Stripe checkout with test card
5. Verify lead purchase is recorded

**Test Card Details:**
- Number: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Verification:**
```sql
-- Check lead purchase
SELECT lp.*, g.title, dp.business_name
FROM lead_purchases lp
JOIN gigs g ON lp.gig_id = g.id
JOIN digger_profiles dp ON lp.digger_id = dp.id
WHERE lp.status = 'completed'
ORDER BY lp.purchased_at DESC;
```

**Stripe Verification:**
- Check Stripe dashboard: https://dashboard.stripe.com/test/payments
- Verify payment intent created and succeeded

#### Step 4: Submit Bid
1. After purchasing lead, view full gig details
2. Click "Submit Bid"
3. Enter bid amount and proposal
4. Submit bid
5. Verify consumer receives notification

**Verification:**
```sql
-- Check bid created
SELECT * FROM bids 
WHERE gig_id = 'gig-id' 
AND digger_id = 'digger-id';

-- Check notification sent
SELECT * FROM notifications 
WHERE type = 'new_bid' 
AND metadata->>'gig_id' = 'gig-id';
```

### Phase 3: Communication & Completion

#### Step 5: Messaging
1. Consumer and digger exchange messages at `/messages`
2. Verify messages are delivered in real-time
3. Check read receipts update

**Verification:**
```sql
-- Check conversation created
SELECT c.*, g.title
FROM conversations c
JOIN gigs g ON c.gig_id = g.id
WHERE c.consumer_id = 'consumer-id' 
AND c.digger_id = 'digger-id';

-- Check messages
SELECT m.*, p.email as sender_email
FROM messages m
JOIN profiles p ON m.sender_id = p.id
WHERE m.conversation_id = 'conversation-id'
ORDER BY m.created_at;
```

#### Step 6: Transaction Completion
1. Consumer marks work as complete
2. Payment is processed
3. Transaction record created with commission calculation
4. Both parties receive confirmation emails

**Verification:**
```sql
-- Check transaction
SELECT t.*, 
       b.amount as bid_amount,
       g.title as gig_title,
       dp.business_name
FROM transactions t
JOIN bids b ON t.bid_id = b.id
JOIN gigs g ON t.gig_id = g.id
JOIN digger_profiles dp ON t.digger_id = dp.id
WHERE t.gig_id = 'gig-id'
ORDER BY t.created_at DESC;
```

**Commission Verification:**
- Free tier: 20% commission
- Pro tier: 10% commission  
- Premium tier: 5% commission

## Payment Flow Testing

### Test Scenarios

#### 1. Free Lead (Premium Digger)
- Digger with premium subscription
- Lead cost should be $0
- No Stripe checkout created

#### 2. Standard Lead Purchase
- Digger with free/pro subscription
- Lead cost based on hourly rate (minimum $100)
- Or $3 for free tier, $2 for pro tier

#### 3. Old Lead Discount
- Lead older than 24 hours
- Always $1 regardless of tier

#### 4. Subscription Purchase
- Test at `/subscription`
- Choose a plan and complete checkout
- Verify subscription status updates

### Stripe Webhook Testing

1. Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

2. Trigger test events:
```bash
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.updated
```

## Email Notification Testing

### Types of Emails to Test

1. **New Bid Notification**
   - Sent to: Consumer
   - Trigger: Digger submits bid
   - Check: Resend dashboard

2. **Bid Accepted Notification**
   - Sent to: Digger
   - Trigger: Consumer accepts bid
   - Check: Resend dashboard

3. **New Message Notification**
   - Sent to: Recipient
   - Trigger: New message sent
   - Check: Resend dashboard

4. **Transaction Report**
   - Sent to: Both parties
   - Trigger: Work completion
   - Check: Resend dashboard

### Verify Email Delivery

1. Go to https://resend.com/emails
2. Check recent emails
3. Verify delivery status
4. Review email content in preview

## Edge Function Logs

Check logs for debugging:
1. Go to Lovable Cloud dashboard
2. Navigate to Edge Functions
3. Select function to view logs
4. Look for errors or warnings

**Key Functions:**
- `match-industry-codes`: AI matching logs
- `send-bid-notification`: Email sending logs
- `create-checkout-session`: Payment logs
- `stripe-webhook`: Webhook processing logs

## Common Issues & Solutions

### Issue: No notifications received
**Solution:**
- Verify digger has matching SIC/NAICS codes
- Check database trigger is active
- Review edge function logs

### Issue: AI matching not working
**Solution:**
- Check LOVABLE_API_KEY is set
- Verify industry_codes table has data
- Test at `/test-ai-matching`

### Issue: Emails not sending
**Solution:**
- Verify RESEND_API_KEY is set
- Check domain is verified at Resend
- Review send-bid-notification logs

### Issue: Stripe checkout fails
**Solution:**
- Verify STRIPE_SECRET_KEY is set
- Check Stripe test mode is enabled
- Use valid test card number

### Issue: Payments not processing
**Solution:**
- Check webhook is configured
- Verify webhook secret matches
- Review stripe-webhook logs

## Success Criteria

✅ Consumer can create account and post gig
✅ AI matches gig to appropriate SIC/NAICS codes
✅ Diggers with matching codes receive notifications
✅ Email notifications are delivered
✅ Digger can purchase lead via Stripe
✅ Messages can be exchanged
✅ Transactions are created and commissions calculated
✅ All parties receive confirmation emails

## Additional Resources

- **Stripe Testing**: https://stripe.com/docs/testing
- **Resend Dashboard**: https://resend.com
- **Supabase Logs**: Lovable Cloud > Edge Functions
- **Database Queries**: Lovable Cloud > Database

## Automated Test Results

After running the automated test suite at `/e2e-test`, review:
- All green checkmarks indicate success
- Yellow warnings indicate missing data or configuration
- Red errors require immediate attention

Export test results and share with development team for review.
