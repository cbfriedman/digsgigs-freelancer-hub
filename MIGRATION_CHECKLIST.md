# Supabase Migration Checklist

## Overview
This document provides a comprehensive checklist for migrating the Digs and Gigs platform to a new Supabase project.

**Project ID (Current):** `ibyhvkfrbdwrnxutnkdy`

---

## 1. Edge Functions (62 Total)

### Lead Management (13)
- [ ] `award-lead` - Awards leads to diggers
- [ ] `calculate-lead-price` - Calculates lead pricing
- [ ] `charge-awarded-lead` - Charges for awarded leads
- [ ] `create-bulk-lead-checkout` - Creates bulk lead checkout ⚠️ (Being modified - checkout flow fixes)
- [ ] `create-bulk-lead-purchase` - Processes bulk lead purchases
- [ ] `create-lead-purchase-checkout` - Creates lead purchase checkout
- [ ] `extend-exclusivity` - Extends exclusivity periods
- [ ] `handle-exclusivity-expiration` - Handles exclusivity expiration
- [ ] `match-leads-to-diggers` - Matches leads to diggers
- [ ] `process-bulk-purchase` - Processes bulk purchases
- [ ] `process-lead-return` - Processes lead returns
- [ ] `send-lead-confirmation` - Sends lead confirmation emails/SMS
- [ ] `trigger-lead-matching` - Triggers lead matching process
- [ ] `verify-lead-confirmation` - Verifies lead confirmations

### Payments/Stripe (13)
- [ ] `calculate-commission` - Calculates commission fees
- [ ] `calculate-telemarketer-commission` - Calculates telemarketer commissions
- [ ] `charge-profile-view` - Charges for profile views
- [ ] `create-checkout-session` - Creates Stripe checkout sessions
- [ ] `create-connect-account` - Creates Stripe Connect accounts
- [ ] `create-extension-checkout` - Creates exclusivity extension checkout
- [ ] `create-free-estimate-checkout` - Creates free estimate checkout
- [ ] `create-profession-checkout` - Creates profession purchase checkout
- [ ] `create-subscription-checkout` - Creates subscription checkout
- [ ] `create-transaction` - Creates transaction records
- [ ] `customer-portal` - Manages Stripe customer portal
- [ ] `process-withdrawal-payment` - Processes withdrawal payments
- [ ] `stripe-webhook` - Handles Stripe webhooks ⚠️ (Being modified - checkout flow fixes)
- [ ] `stripe-webhook-extension` - Handles extension purchase webhooks
- [ ] `stripe-webhook-lead-purchase` - Handles lead purchase webhooks
- [ ] `stripe-webhook-lead-credits` - Handles lead credit purchase webhooks
- [ ] `stripe-webhook-profession-purchase` - Handles profession purchase webhooks
- [ ] `stripe-webhook-profile-view` - Handles profile view webhooks

### AI/Matching (7)
- [ ] `chat-bot` - AI chatbot using Lovable API ⚠️ (LOVABLE_API_KEY required)
- [ ] `generate-bio` - Generates bio content ⚠️ (LOVABLE_API_KEY required)
- [ ] `generate-profile-suggestions` - Generates profile suggestions ⚠️ (LOVABLE_API_KEY required)
- [ ] `match-diggers-semantic` - Semantic matching of diggers ⚠️ (LOVABLE_API_KEY required)
- [ ] `match-industry-codes` - Matches industry codes using AI ⚠️ (LOVABLE_API_KEY required)
- [ ] `suggest-keywords-from-description` - Suggests keywords from descriptions ⚠️ (LOVABLE_API_KEY required)
- [ ] `verify-lead-match` - Verifies lead matches ⚠️ (LOVABLE_API_KEY required)

### Escrow (3)
- [ ] `confirm-escrow-payment` - Confirms escrow payments
- [ ] `create-escrow-contract` - Creates escrow contracts
- [ ] `release-milestone` - Releases milestone payments

### Notifications/Email (8)
- [ ] `notify-keyword-request` - Notifies about keyword requests
- [ ] `send-bid-notification` - Sends bid notifications
- [ ] `send-monthly-reports` - Sends monthly reports
- [ ] `send-notification-digest` - Sends notification digests
- [ ] `send-otp-email` - Sends OTP verification emails via Resend ⚠️ (RESEND_API_KEY required - currently failing)
- [ ] `send-profile-reminders` - Sends profile completion reminders
- [ ] `send-saved-search-alerts` - Sends saved search alerts
- [ ] `send-transaction-report` - Sends transaction reports via email

### Blog (3)
- [ ] `generate-blog-post` - Generates blog posts using AI ⚠️ (LOVABLE_API_KEY required)
- [ ] `generate-step-image` - Generates step images ⚠️ (LOVABLE_API_KEY required)
- [ ] `trigger-daily-blog` - Triggers daily blog generation

### Auth/Verification (3)
- [ ] `cleanup-login-attempts` - Cleans up login attempt records
- [ ] `verify-custom-otp` - Verifies custom OTP codes
- [ ] `request-keyword-suggestions` - Requests keyword suggestions

### Utility (7)
- [ ] `check-subscription` - Checks user subscription status
- [ ] `check-upgrade-savings` - Checks upgrade savings
- [ ] `generate-sitemap` - Generates sitemap
- [ ] `request-free-estimate` - Requests free estimates
- [ ] `reset-monthly-leads` - Resets monthly lead counts
- [ ] `test-ai-matching` - Tests AI matching functionality
- [ ] `track-award-cost` - Tracks award costs
- [ ] `withdraw-bid` - Withdraws bids

---

## 2. Database Schema

### Tables (47 Total)
- [ ] `profiles` - User profiles (linked to auth.users)
- [ ] `user_roles` - Legacy role storage
- [ ] `user_app_roles` - Current role assignments (digger/gigger/telemarketer/admin)
- [ ] `gigs` - Job postings by Giggers
- [ ] `bids` - Bids submitted by Diggers
- [ ] `digger_profiles` - Digger-specific profile data
- [ ] `digger_professions` - Professions linked to digger profiles
- [ ] `digger_specialties` - Specialties within professions
- [ ] `digger_categories` - Category associations
- [ ] `digger_lead_balance` - Lead credit balance tracking
- [ ] `telemarketer_profiles` - Telemarketer-specific data
- [ ] `telemarketer_commissions` - Commission tracking
- [ ] `lead_purchases` - Lead purchase records
- [ ] `lead_exclusivity_queue` - Exclusive lead queue management
- [ ] `lead_exclusivity_extensions` - Extension purchases
- [ ] `lead_balance_transactions` - Balance transaction history
- [ ] `lead_issues` - Reported lead issues
- [ ] `transactions` - Financial transactions
- [ ] `escrow_contracts` - Escrow agreements
- [ ] `milestone_payments` - Milestone-based payments
- [ ] `categories` - Service categories (hierarchical)
- [ ] `custom_categories` - User-created categories
- [ ] `industry_codes` - SIC/NAICS codes
- [ ] `conversations` - Message threads
- [ ] `messages` - Individual messages
- [ ] `notifications` - User notifications
- [ ] `notification_digest_queue` - Digest email queue
- [ ] `email_preferences` - User email settings
- [ ] `ratings` - Reviews and ratings
- [ ] `references` - Professional references
- [ ] `reference_contact_requests` - Reference contact requests
- [ ] `profile_views` - Profile view tracking
- [ ] `profile_completion_reminders` - Reminder tracking
- [ ] `saved_searches` - Saved search filters
- [ ] `saved_search_alerts` - Alert configurations
- [ ] `verification_codes` - OTP verification codes
- [ ] `login_attempts` - Rate limiting/security
- [ ] `keyword_analytics` - Keyword usage tracking
- [ ] `keyword_suggestion_requests` - Keyword request queue
- [ ] `blog_posts` - Blog content
- [ ] `blog_categories` - Blog categorization
- [ ] `blog_tags` - Blog tags
- [ ] `blog_post_tags` - Post-tag associations
- [ ] `blog_generation_settings` - AI blog generation config
- [ ] `blog_generation_history` - Generation history
- [ ] `chat_messages` - AI chatbot history
- [ ] `withdrawal_penalties` - Bid withdrawal penalties

### Database Functions (27 Total)
- [ ] `handle_new_user()` - Creates profile on signup
- [ ] `create_notification()` - Notification creation
- [ ] `add_notification_to_digest_queue()` - Digest queue management
- [ ] `assign_profile_number()` - Auto-assigns DG-XXX profile numbers
- [ ] `calculate_lead_price()` - Lead pricing logic
- [ ] `check_rate_limit()` - Rate limiting
- [ ] `cleanup_expired_verification_codes()` - Cleanup job
- [ ] `cleanup_old_login_attempts()` - Security cleanup
- [ ] `get_tier_for_lead_count(INTEGER)` - Pricing tier calculation
- [ ] `reset_monthly_lead_counts()` - Resets monthly lead counts
- [ ] `has_app_role(UUID, user_app_role)` - Checks if user has app role
- [ ] `get_user_app_roles(UUID)` - Gets all user app roles
- [ ] `increment_blog_post_views(TEXT)` - Increments blog post view count
- [ ] `update_digger_rating()` - Updates digger rating averages
- [ ] `handle_new_user_email_preferences()` - Creates email preferences for new users
- [ ] `update_updated_at_column()` - Updates updated_at timestamp
- [ ] Verify all other database functions from migrations

### Storage Buckets (3)
- [ ] Verify storage buckets are created
- [ ] Verify bucket policies are configured
- [ ] Verify RLS policies for storage

## 3. Secrets Configuration (10 Required)

### Critical Secrets (Must Configure)
1. **RESEND_API_KEY** ⚠️
   - **Used in:** `send-otp-email`, `send-transaction-report`, `send-lead-confirmation`, `send-monthly-reports`, `send-notification-digest`, `send-bid-notification`, `notify-keyword-request`, `send-profile-reminders`, `send-saved-search-alerts`, `check-upgrade-savings`
   - **Issue:** Currently failing due to secret injection problems
   - **Action:** Verify secret is properly set in Supabase dashboard → Settings → Edge Functions → Secrets

2. **LOVABLE_API_KEY** ⚠️
   - **Used in:** `chat-bot`, `generate-blog-post`, `match-industry-codes`, `generate-step-image`, `generate-profile-suggestions`, `generate-bio`, `match-diggers-semantic`, `suggest-keywords-from-description`, `verify-lead-match`
   - **Issue:** Not being injected into edge functions
   - **Action:** Verify secret is properly set and functions are redeployed after secret configuration

3. **SUPABASE_URL**
   - **Used in:** All edge functions
   - **Note:** Automatically available, but verify in new project

4. **SUPABASE_SERVICE_ROLE_KEY**
   - **Used in:** Most edge functions
   - **Note:** Automatically available, but verify in new project

### Payment & External Services
5. **STRIPE_SECRET_KEY**
   - **Used in:** All Stripe-related functions
   - **Action:** Configure in Supabase secrets

6. **STRIPE_WEBHOOK_SECRET**
   - **Used in:** All Stripe webhook handlers
   - **Action:** Configure in Supabase secrets

### Communication Services
7. **TWILIO_ACCOUNT_SID**
   - **Used in:** `send-lead-confirmation` (SMS functionality)
   - **Action:** Configure if SMS features are needed

8. **TWILIO_AUTH_TOKEN**
   - **Used in:** `send-lead-confirmation` (SMS functionality)
   - **Action:** Configure if SMS features are needed

9. **TWILIO_PHONE_NUMBER**
   - **Used in:** `send-lead-confirmation` (SMS functionality)
   - **Action:** Configure if SMS features are needed

### Mapping Services
10. **MAPBOX_ACCESS_TOKEN**
   - **Used in:** Geocoding and mapping features
   - **Action:** Configure if mapping features are needed

---

## 3. Database Schema

### Tables (30+)
- [ ] Run all migrations from `supabase/migrations/` directory (95 migration files)
- [ ] Verify all tables are created
- [ ] Verify all RLS policies are enabled
- [ ] Verify all indexes are created

### Database Functions (22+)
- [ ] `get_tier_for_lead_count(INTEGER)` - Determines tier based on lead count
- [ ] `reset_monthly_lead_counts()` - Resets monthly lead counts
- [ ] `has_app_role(UUID, user_app_role)` - Checks if user has app role
- [ ] `get_user_app_roles(UUID)` - Gets all user app roles
- [ ] `increment_blog_post_views(TEXT)` - Increments blog post view count
- [ ] `update_digger_rating()` - Updates digger rating averages
- [ ] `handle_new_user()` - Handles new user creation
- [ ] `handle_new_user_email_preferences()` - Creates email preferences for new users
- [ ] `update_updated_at_column()` - Updates updated_at timestamp
- [ ] Verify all other database functions from migrations

### Storage Buckets (3)
- [ ] Verify storage buckets are created
- [ ] Verify bucket policies are configured
- [ ] Verify RLS policies for storage

---

## 4. Known Issues & Fixes

### Issue 1: OTP Email Delivery Failure ⚠️
**Problem:** Resend integration failing due to secret injection
**Affected Function:** `send-otp-email`
**Current Status:** Function exists but `RESEND_API_KEY` not being injected

**Fix Steps:**
1. Navigate to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Add `RESEND_API_KEY` secret with your Resend API key
3. Redeploy the `send-otp-email` function:
   ```bash
   supabase functions deploy send-otp-email
   ```
4. Test the function with a sample request
5. Verify emails are being sent successfully

**Code Location:** `supabase/functions/send-otp-email/index.ts`

### Issue 2: LOVABLE_API_KEY Not Injected ⚠️
**Problem:** Edge function `LOVABLE_API_KEY` not being injected
**Affected Functions:** 
- `chat-bot`
- `generate-blog-post`
- `match-industry-codes`
- `generate-step-image`
- `generate-profile-suggestions`
- `generate-bio`
- `match-diggers-semantic`
- `suggest-keywords-from-description`
- `verify-lead-match`

**Fix Steps:**
1. Navigate to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Add `LOVABLE_API_KEY` secret with your Lovable API key
3. Redeploy all affected functions:
   ```bash
   supabase functions deploy chat-bot
   supabase functions deploy generate-blog-post
   supabase functions deploy match-industry-codes
   supabase functions deploy generate-step-image
   supabase functions deploy generate-profile-suggestions
   supabase functions deploy generate-bio
   supabase functions deploy match-diggers-semantic
   supabase functions deploy suggest-keywords-from-description
   supabase functions deploy verify-lead-match
   ```
4. Test each function to verify secret injection

### Issue 3: Auto-Confirm Email Workaround ⚠️
**Problem:** Auto-confirm email currently enabled as workaround
**Current Status:** Users don't need to verify email to sign up

**Fix Steps:**
1. Navigate to Supabase Dashboard → Authentication → Settings
2. Disable "Enable email confirmations" or set to appropriate value
3. Update email templates if needed
4. Test registration flow to ensure OTP emails work correctly
5. Once OTP email delivery is fixed (Issue 1), disable auto-confirm

**Note:** This workaround was likely enabled because OTP emails weren't working. Once Issue 1 is resolved, this should be disabled.

---

## 5. Migration Steps

### Pre-Migration
- [ ] Backup current database
- [ ] Export all data (if needed)
- [ ] Document current configuration
- [ ] List all custom domains (if any)

### Database Migration
- [ ] Create new Supabase project
- [ ] Run all migrations in order:
  ```bash
  supabase db push
  ```
- [ ] Verify all tables created
- [ ] Verify all RLS policies enabled
- [ ] Verify all database functions created
- [ ] Verify all triggers created
- [ ] Test database functions

### Edge Functions Migration
- [ ] Deploy all edge functions:
  ```bash
  supabase functions deploy --all
  ```
- [ ] Configure all secrets in Supabase dashboard
- [ ] Redeploy functions after secret configuration
- [ ] Test each function individually
- [ ] Verify function logs for errors

### Storage Migration
- [ ] Create storage buckets
- [ ] Configure bucket policies
- [ ] Migrate existing files (if any)
- [ ] Verify RLS policies for storage

### Configuration
- [ ] Update `supabase/config.toml` with new project ID
- [ ] Update environment variables in application
- [ ] Update API endpoints in application
- [ ] Configure custom domains (if any)

### Testing
- [ ] Test authentication flow
- [ ] Test OTP email delivery
- [ ] Test payment processing
- [ ] Test lead matching
- [ ] Test AI features (chatbot, blog generation, etc.)
- [ ] Test email notifications
- [ ] Test all critical user flows

### Post-Migration
- [ ] Monitor error logs
- [ ] Monitor function execution times
- [ ] Verify all secrets are working
- [ ] Update DNS records (if custom domain)
- [ ] Update application deployment

---

## 6. Edge Function Categories

### By Function Type
- **Authentication (5):** OTP, verification, login cleanup
- **Payments (22):** Stripe integration, checkout, webhooks, escrow
- **Lead Management (10):** Matching, confirmation, pricing
- **AI/Content (9):** Chatbot, blog generation, suggestions
- **Notifications (3):** Alerts, reminders, digests
- **Utilities (5):** Sitemap, savings calculator, estimates

### By JWT Verification
- **verify_jwt = true (24):** User-authenticated functions
- **verify_jwt = false (40):** Public or service functions

---

## 7. Critical Dependencies

### External APIs
- **Resend:** Email delivery (OTP, notifications, reports)
- **Stripe:** Payment processing
- **Lovable AI:** AI features (chatbot, content generation, matching)
- **Twilio:** SMS delivery (optional)
- **Mapbox:** Geocoding and mapping (optional)

### Supabase Services
- **Auth:** User authentication
- **Database:** PostgreSQL with RLS
- **Storage:** File storage
- **Edge Functions:** Serverless functions
- **Realtime:** Real-time subscriptions (if used)

---

## 8. Verification Checklist

After migration, verify:

- [ ] All edge functions deployed successfully
- [ ] All secrets configured and accessible
- [ ] OTP emails are being sent successfully
- [ ] AI features (chatbot, blog generation) are working
- [ ] Payment processing is working
- [ ] Lead matching is working
- [ ] Email notifications are being sent
- [ ] Database queries are performing well
- [ ] RLS policies are working correctly
- [ ] Storage buckets are accessible
- [ ] No errors in function logs
- [ ] Application is connecting to new project

---

## 9. Rollback Plan

If migration fails:
1. Keep old project running
2. Document all issues encountered
3. Fix issues in new project
4. Test fixes thoroughly
5. Re-attempt migration
6. Only switch DNS/endpoints after full verification

---

## 10. Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Edge Functions Docs:** https://supabase.com/docs/guides/functions
- **Database Migrations:** https://supabase.com/docs/guides/cli/local-development#database-migrations
- **Secrets Management:** https://supabase.com/docs/guides/functions/secrets

---

## Notes

- **Edge Functions:** 62 total (categorized by function type)
  - 2 functions being modified: `create-bulk-lead-checkout`, `stripe-webhook` (checkout flow fixes)
- **Database Tables:** 48 total with RLS policies (includes new `lead_credits` table)
- **Database Functions:** 27 total across migrations
- **Storage Buckets:** 3 total
- **Secrets Required:** 10 (2 critical for current issues)
- All secrets must be configured in Supabase dashboard before functions will work
- Auto-confirm email is currently enabled as workaround for OTP email issues
- **Recent Changes:** Checkout flow fixes adding `lead_credits` table and updating webhook handlers
- See MIGRATION_INVENTORY.md for complete detailed inventory

---

**Last Updated:** 2024-12-19
**Migration Status:** Pending

