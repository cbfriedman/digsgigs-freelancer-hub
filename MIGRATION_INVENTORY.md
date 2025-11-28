# Digs and Gigs - Complete Migration Inventory

## Overview
This document provides the complete, accurate inventory of all components for migration.

**Project ID (Current):** `ibyhvkfrbdwrnxutnkdy`

---

## 1. Edge Functions (62 Total)

### Lead Management (13 functions)
- [ ] `award-lead` - Awards leads to diggers
- [ ] `calculate-lead-price` - Calculates lead pricing
- [ ] `charge-awarded-lead` - Charges for awarded leads
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

### Payments/Stripe (13 functions)
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
- [ ] `stripe-webhook` - Handles Stripe webhooks
- [ ] `stripe-webhook-extension` - Handles extension purchase webhooks
- [ ] `stripe-webhook-lead-purchase` - Handles lead purchase webhooks
- [ ] `stripe-webhook-profession-purchase` - Handles profession purchase webhooks
- [ ] `stripe-webhook-profile-view` - Handles profile view webhooks

### AI/Matching (7 functions)
- [ ] `chat-bot` - AI chatbot using Lovable API ⚠️ (LOVABLE_API_KEY required)
- [ ] `generate-bio` - Generates bio content ⚠️ (LOVABLE_API_KEY required)
- [ ] `generate-profile-suggestions` - Generates profile suggestions ⚠️ (LOVABLE_API_KEY required)
- [ ] `match-diggers-semantic` - Semantic matching of diggers ⚠️ (LOVABLE_API_KEY required)
- [ ] `match-industry-codes` - Matches industry codes using AI ⚠️ (LOVABLE_API_KEY required)
- [ ] `suggest-keywords-from-description` - Suggests keywords from descriptions ⚠️ (LOVABLE_API_KEY required)
- [ ] `verify-lead-match` - Verifies lead matches ⚠️ (LOVABLE_API_KEY required)

### Escrow (3 functions)
- [ ] `confirm-escrow-payment` - Confirms escrow payments
- [ ] `create-escrow-contract` - Creates escrow contracts
- [ ] `release-milestone` - Releases milestone payments

### Notifications/Email (8 functions)
- [ ] `notify-keyword-request` - Notifies about keyword requests
- [ ] `send-bid-notification` - Sends bid notifications
- [ ] `send-monthly-reports` - Sends monthly reports
- [ ] `send-notification-digest` - Sends notification digests
- [ ] `send-otp-email` - Sends OTP verification emails via Resend ⚠️ (RESEND_API_KEY required - currently failing)
- [ ] `send-profile-reminders` - Sends profile completion reminders
- [ ] `send-saved-search-alerts` - Sends saved search alerts
- [ ] `send-transaction-report` - Sends transaction reports via email

### Blog (3 functions)
- [ ] `generate-blog-post` - Generates blog posts using AI ⚠️ (LOVABLE_API_KEY required)
- [ ] `generate-step-image` - Generates step images ⚠️ (LOVABLE_API_KEY required)
- [ ] `trigger-daily-blog` - Triggers daily blog generation

### Auth/Verification (3 functions)
- [ ] `cleanup-login-attempts` - Cleans up login attempt records
- [ ] `verify-custom-otp` - Verifies custom OTP codes
- [ ] `request-keyword-suggestions` - Requests keyword suggestions

### Utility (7 functions)
- [ ] `check-subscription` - Checks user subscription status
- [ ] `check-upgrade-savings` - Checks upgrade savings
- [ ] `generate-sitemap` - Generates sitemap
- [ ] `request-free-estimate` - Requests free estimates
- [ ] `reset-monthly-leads` - Resets monthly lead counts
- [ ] `test-ai-matching` - Tests AI matching functionality
- [ ] `track-award-cost` - Tracks award costs
- [ ] `withdraw-bid` - Withdraws bids

---

## 2. Database Tables (47 Total)

### User & Profile Management
- [ ] `profiles` - User profiles (linked to auth.users)
- [ ] `user_roles` - Legacy role storage
- [ ] `user_app_roles` - Current role assignments (digger/gigger/telemarketer/admin)
- [ ] `digger_profiles` - Digger-specific profile data
- [ ] `digger_professions` - Professions linked to digger profiles
- [ ] `digger_specialties` - Specialties within professions
- [ ] `digger_categories` - Category associations
- [ ] `digger_lead_balance` - Lead credit balance tracking
- [ ] `telemarketer_profiles` - Telemarketer-specific data
- [ ] `telemarketer_commissions` - Commission tracking

### Lead Management
- [ ] `gigs` - Job postings by Giggers
- [ ] `lead_purchases` - Lead purchase records
- [ ] `lead_exclusivity_queue` - Exclusive lead queue management
- [ ] `lead_exclusivity_extensions` - Extension purchases
- [ ] `lead_balance_transactions` - Balance transaction history
- [ ] `lead_issues` - Reported lead issues

### Bidding & Proposals
- [ ] `bids` - Bids submitted by Diggers

### Financial & Transactions
- [ ] `transactions` - Financial transactions
- [ ] `escrow_contracts` - Escrow agreements
- [ ] `milestone_payments` - Milestone-based payments

### Categories & Industry
- [ ] `categories` - Service categories (hierarchical)
- [ ] `custom_categories` - User-created categories
- [ ] `industry_codes` - SIC/NAICS codes

### Communication
- [ ] `conversations` - Message threads
- [ ] `messages` - Individual messages

### Notifications
- [ ] `notifications` - User notifications
- [ ] `notification_digest_queue` - Digest email queue
- [ ] `email_preferences` - User email settings

### Reviews & References
- [ ] `ratings` - Reviews and ratings
- [ ] `references` - Professional references
- [ ] `reference_contact_requests` - Reference contact requests

### Analytics & Tracking
- [ ] `profile_views` - Profile view tracking
- [ ] `profile_completion_reminders` - Reminder tracking
- [ ] `saved_searches` - Saved search filters
- [ ] `saved_search_alerts` - Alert configurations
- [ ] `keyword_analytics` - Keyword usage tracking
- [ ] `keyword_suggestion_requests` - Keyword request queue

### Security & Auth
- [ ] `verification_codes` - OTP verification codes
- [ ] `login_attempts` - Rate limiting/security

### Blog System
- [ ] `blog_posts` - Blog content
- [ ] `blog_categories` - Blog categorization
- [ ] `blog_tags` - Blog tags
- [ ] `blog_post_tags` - Post-tag associations
- [ ] `blog_generation_settings` - AI blog generation config
- [ ] `blog_generation_history` - Generation history

### AI & Chat
- [ ] `chat_messages` - AI chatbot history

### Penalties
- [ ] `withdrawal_penalties` - Bid withdrawal penalties

---

## 3. Database Functions (27 Total)

### User Management
- [ ] `handle_new_user()` - Creates profile on signup
- [ ] `assign_profile_number()` - Auto-assigns DG-XXX profile numbers

### Notifications
- [ ] `create_notification()` - Notification creation
- [ ] `add_notification_to_digest_queue()` - Digest queue management

### Lead Management
- [ ] `calculate_lead_price()` - Lead pricing logic
- [ ] `get_tier_for_lead_count(INTEGER)` - Pricing tier calculation
- [ ] `reset_monthly_lead_counts()` - Resets monthly lead counts

### Security & Rate Limiting
- [ ] `check_rate_limit()` - Rate limiting
- [ ] `cleanup_expired_verification_codes()` - Cleanup job
- [ ] `cleanup_old_login_attempts()` - Security cleanup

### Additional Functions (from migrations)
- [ ] `has_app_role(UUID, user_app_role)` - Checks if user has app role
- [ ] `get_user_app_roles(UUID)` - Gets all user app roles
- [ ] `increment_blog_post_views(TEXT)` - Increments blog post view count
- [ ] `update_digger_rating()` - Updates digger rating averages
- [ ] `handle_new_user_email_preferences()` - Creates email preferences for new users
- [ ] `update_updated_at_column()` - Updates updated_at timestamp

**Note:** Additional functions may exist in migrations. Verify all functions are created after running migrations.

---

## 4. Storage Buckets (3 Total)

- [ ] Verify bucket 1 (check migrations for bucket names)
- [ ] Verify bucket 2
- [ ] Verify bucket 3
- [ ] Verify bucket policies are configured
- [ ] Verify RLS policies for storage

---

## 5. Secrets Configuration (10 Required)

### Critical Secrets ⚠️
1. **RESEND_API_KEY** - Email delivery (10 functions)
2. **LOVABLE_API_KEY** - AI features (7 functions)
3. **SUPABASE_URL** - Auto-available
4. **SUPABASE_SERVICE_ROLE_KEY** - Auto-available

### Payment Secrets
5. **STRIPE_SECRET_KEY** - Payment processing
6. **STRIPE_WEBHOOK_SECRET** - Webhook verification

### Communication Secrets (Optional)
7. **TWILIO_ACCOUNT_SID** - SMS (if used)
8. **TWILIO_AUTH_TOKEN** - SMS (if used)
9. **TWILIO_PHONE_NUMBER** - SMS (if used)

### Mapping Secrets (Optional)
10. **MAPBOX_ACCESS_TOKEN** - Geocoding (if used)

---

## 6. Known Issues

### Issue 1: OTP Email Delivery ⚠️
- **Function:** `send-otp-email`
- **Problem:** RESEND_API_KEY not being injected
- **Status:** Currently failing
- **Fix:** Configure secret and redeploy function

### Issue 2: LOVABLE_API_KEY Not Injected ⚠️
- **Functions:** 7 AI-related functions
- **Problem:** Secret not being injected
- **Status:** Currently failing
- **Fix:** Configure secret and redeploy all affected functions

### Issue 3: Auto-Confirm Email Enabled ⚠️
- **Problem:** Workaround for OTP email issues
- **Status:** Currently active
- **Fix:** Disable after fixing Issue #1

---

## 7. Migration Statistics Summary

| Component | Count |
|-----------|-------|
| Edge Functions | 62 |
| Database Tables | 47 |
| Database Functions | 27 |
| Storage Buckets | 3 |
| Secrets Required | 10 |
| SQL Migrations | 95 files |

---

## 8. Migration Priority

### High Priority (Must Fix)
1. Configure RESEND_API_KEY → Fix OTP emails
2. Configure LOVABLE_API_KEY → Fix AI features
3. Deploy all edge functions
4. Run all database migrations

### Medium Priority
5. Configure Stripe secrets
6. Test payment processing
7. Verify RLS policies
8. Test all critical user flows

### Low Priority
9. Configure optional secrets (Twilio, Mapbox)
10. Optimize performance
11. Set up monitoring

---

**Last Updated:** 2024-12-19
**Status:** Ready for Migration

