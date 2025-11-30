# Digs and Gigs - Technical Migration Documentation

**Project:** Lovable Cloud → Vercel + External Supabase Migration  
**Developer:** Hongqiang C.  
**Document Date:** November 30, 2025  
**Migration Budget:** $750 Migration + $300 Debugging = $1,050 Total

---

## Table of Contents

1. [Known Issues (Priority Order)](#known-issues-priority-order)
2. [Infrastructure Inventory](#infrastructure-inventory)
3. [Secrets Configuration](#secrets-configuration)
4. [Migration Priority](#migration-priority)
5. [Current Workarounds](#current-workarounds)
6. [Files Requiring Attention](#files-requiring-attention)
7. [Testing Requirements](#testing-requirements)

---

## Known Issues (Priority Order)

### ❌ CRITICAL ISSUE #1: OTP Email Delivery Failure

| Field | Details |
|-------|---------|
| **Status** | Failing - workaround in place |
| **Edge Function** | `send-otp-email` |
| **Root Cause** | `RESEND_API_KEY` not being injected into edge function by Lovable Cloud |
| **Current Workaround** | Auto-confirm email enabled in Supabase Auth settings |
| **Impact** | Users cannot verify email via OTP; registration bypasses verification step |
| **Files Affected** | `supabase/functions/send-otp-email/index.ts`, `src/pages/Register.tsx` |
| **Fix Required** | 1. Configure `RESEND_API_KEY` in new Supabase project secrets<br>2. Redeploy `send-otp-email` function<br>3. Test OTP delivery<br>4. Disable auto-confirm once working |

**Available Credentials:**
- **API Key:** `re_ZKnB58fY_JWGvTTkz1FDmV59gPLe8q6EV`
- **Sending Domain:** `updates.digsandgigs.com`

---

### ❌ CRITICAL ISSUE #2: LOVABLE_API_KEY Not Injected

| Field | Details |
|-------|---------|
| **Status** | AI features completely non-functional |
| **Affected Functions** | `chat-bot`, `generate-bio`, `generate-profile-suggestions`, `match-diggers-semantic`, `match-industry-codes`, `suggest-keywords-from-description`, `verify-lead-match`, `generate-blog-post`, `generate-step-image` (9 functions total) |
| **Root Cause** | Secret not being injected by Lovable Cloud infrastructure |
| **Impact** | AI chatbot, bio generation, semantic matching, keyword suggestions all fail |
| **Fix Required** | Need to obtain `LOVABLE_API_KEY` from Lovable support, then configure in new Supabase project → redeploy all 9 AI functions |

---

### ⚠️ ISSUE #3: Role Auto-Assignment Flow

| Field | Details |
|-------|---------|
| **Status** | Related to Issue #1 workaround |
| **Location** | `src/pages/Register.tsx` line 246 |
| **Current Behavior** | Registration skips verification step, goes directly to role selection |
| **Cause** | `handleBasicInfoSubmit()` calls `setStep(3)` instead of `setStep(2)` to bypass broken OTP verification |
| **Expected Flow** | Step 1 (Basic Info) → Step 2 (OTP Verification) → Step 3 (Role Selection) |
| **Current Flow** | Step 1 (Basic Info) → Step 3 (Role Selection) - skips verification entirely |
| **Fix Required** | Once OTP email delivery works, restore proper flow: change line 246 to `setStep(2)` and disable auto-confirm |

---

## Infrastructure Inventory

### Edge Functions (62 Total)

#### Lead Management (15 Functions)
- `award-lead`
- `calculate-lead-price`
- `charge-awarded-lead`
- `create-bulk-lead-checkout` ⚠️ (recently modified)
- `create-bulk-lead-purchase`
- `create-lead-purchase-checkout`
- `extend-exclusivity`
- `handle-exclusivity-expiration`
- `handle-semi-exclusive-expiration` ⚠️ (recently added)
- `match-leads-to-diggers`
- `process-bulk-purchase`
- `process-lead-return`
- `send-lead-confirmation`
- `trigger-lead-matching`
- `verify-lead-confirmation`

#### Payments/Stripe (16 Functions)
- `calculate-commission`
- `calculate-telemarketer-commission`
- `charge-profile-view`
- `create-checkout-session`
- `create-connect-account`
- `create-extension-checkout`
- `create-free-estimate-checkout`
- `create-profession-checkout`
- `create-subscription-checkout`
- `create-transaction`
- `customer-portal`
- `process-withdrawal-payment`
- `stripe-webhook` ⚠️ (recently modified)
- `stripe-webhook-extension`
- `stripe-webhook-lead-credits`
- `stripe-webhook-lead-purchase`
- `stripe-webhook-profession-purchase`
- `stripe-webhook-profile-view`

#### AI/Matching (9 Functions) - **Require LOVABLE_API_KEY**
- `auto-categorize-gig` ⚠️ (recently added)
- `chat-bot`
- `generate-bio`
- `generate-blog-post`
- `generate-profile-suggestions`
- `generate-step-image`
- `match-diggers-semantic`
- `match-industry-codes`
- `suggest-keywords-from-description`
- `verify-lead-match`

#### Notifications/Email (10 Functions) - **Require RESEND_API_KEY**
- `check-upgrade-savings`
- `notify-keyword-request`
- `send-bid-notification`
- `send-monthly-reports`
- `send-notification-digest`
- `send-otp-email` ⚠️ (CRITICAL - currently failing)
- `send-profile-reminders`
- `send-saved-search-alerts`
- `send-transaction-report`
- `verify-custom-otp`

#### Escrow (3 Functions)
- `confirm-escrow-payment`
- `create-escrow-contract`
- `release-milestone`

#### Blog (2 Functions)
- `trigger-daily-blog`
- (Note: `generate-blog-post` and `generate-step-image` counted under AI functions)

#### Auth/Verification (2 Functions)
- `cleanup-login-attempts`
- `request-keyword-suggestions`

#### Utility (5 Functions)
- `check-subscription`
- `generate-sitemap`
- `request-free-estimate`
- `reset-monthly-leads`
- `test-ai-matching`
- `track-award-cost`
- `withdraw-bid`

---

### Database Tables (47 Total)

#### User & Profile Management (10 Tables)
- `profiles` - Core user profiles
- `user_roles` - Legacy role system
- `user_app_roles` - Current multi-role system
- `digger_profiles` - Service provider profiles (supports multiple per user)
- `digger_professions` - Profession categories per digger profile
- `digger_specialties` - Specialties within professions
- `digger_categories` - Category associations
- `digger_lead_balance` - Lead credit balance tracking
- `telemarketer_profiles` - Telemarketer accounts
- `telemarketer_commissions` - Commission tracking

#### Lead Management (7 Tables)
- `gigs` - Client-posted job requests
- `lead_purchases` - Individual lead purchase records
- `lead_credits` - Bulk-purchased lead allowances ⚠️ (recently added)
- `lead_exclusivity_queue` - Exclusive/semi-exclusive lead queue
- `lead_exclusivity_extensions` - 24hr extension purchases
- `lead_balance_transactions` - Lead credit transaction history
- `lead_issues` - Lead quality dispute tracking

#### Bidding & Proposals (1 Table)
- `bids` - Digger proposals on gigs

#### Financial & Transactions (3 Tables)
- `transactions` - Payment records
- `escrow_contracts` - Escrow agreement tracking
- `milestone_payments` - Escrow milestone releases

#### Categories & Industry Codes (3 Tables)
- `categories` - Service categories
- `custom_categories` - User-created custom categories
- `industry_codes` - NAICS/SIC code mapping

#### Communication (2 Tables)
- `conversations` - Message threads
- `messages` - Individual messages

#### Notifications (3 Tables)
- `notifications` - User notifications
- `notification_digest_queue` - Digest email queue
- `email_preferences` - User email settings

#### Reviews & References (3 Tables)
- `ratings` - Digger reviews
- `references` - Digger references
- `reference_contact_requests` - Reference contact requests

#### Analytics & Search (5 Tables)
- `profile_views` - Profile view tracking
- `profile_completion_reminders` - Onboarding reminders
- `saved_searches` - Saved search filters
- `saved_search_alerts` - Search alert history
- `keyword_analytics` - Keyword usage tracking
- `keyword_suggestion_requests` - Custom keyword requests

#### Security & Auth (2 Tables)
- `verification_codes` - OTP code storage
- `login_attempts` - Rate limiting

#### Blog (5 Tables)
- `blog_posts` - Blog content
- `blog_categories` - Blog categories
- `blog_tags` - Blog tags
- `blog_post_tags` - Post-tag associations
- `blog_generation_settings` - Auto-blog settings
- `blog_generation_history` - Generation logs

#### AI Features (1 Table)
- `chat_messages` - Chatbot conversation history

#### Other (1 Table)
- `withdrawal_penalties` - Bid withdrawal penalties

---

### Database Functions (27 Total)

#### User Management
- `handle_new_user()` - Auto-create profile on signup
- `assign_profile_number()` - Sequential profile numbering
- `sync_user_type_to_app_roles()` - Role synchronization
- `has_app_role()` - Role checking
- `get_user_app_roles()` - Fetch user roles
- `is_digger()` - Digger role check
- `has_role()` - Legacy role check
- `gigger_has_access_to_digger()` - Profile access control

#### Notifications
- `create_notification()` - Notification creation
- `add_notification_to_digest_queue()` - Queue digest emails
- `notify_gig_owner_of_new_bid()` - Bid notifications
- `notify_message_recipient()` - Message notifications
- `notify_bid_status_change()` - Bid status updates

#### Lead Management
- `calculate_lead_price()` - Dynamic pricing calculation
- `get_tier_for_lead_count()` - Subscription tier logic
- `reset_monthly_lead_counts()` - Monthly reset job
- `increment_gig_purchase_count()` - Purchase counter

#### Security & Rate Limiting
- `check_rate_limit()` - Login attempt limiting
- `cleanup_expired_verification_codes()` - OTP cleanup
- `cleanup_old_login_attempts()` - Login history cleanup

#### Other
- `update_digger_rating()` - Rating aggregation
- `handle_new_user_email_preferences()` - Email prefs setup
- `update_updated_at_column()` - Timestamp trigger
- `update_custom_categories_updated_at()` - Category timestamp
- `update_conversation_timestamp()` - Message timestamp
- `increment_blog_post_views()` - Blog view counter
- `track_keyword_usage()` - Keyword analytics
- `is_gig_owner()` - Gig ownership check

---

### Storage Buckets (4 Total)

| Bucket Name | Public? | Purpose |
|-------------|---------|---------|
| `profile-images` | ✅ Yes | Digger profile photos |
| `work-photos` | ✅ Yes | Portfolio/work examples |
| `profile-photos` | ✅ Yes | User avatars |
| `gig-documents` | ❌ No | Private gig attachments (plans, specs) |

**RLS Policies:** All buckets have Row-Level Security policies that must be migrated.

---

## Secrets Configuration

### Required Secrets

| Secret Name | Status | Priority | Used By | Notes |
|-------------|--------|----------|---------|-------|
| `RESEND_API_KEY` | ✅ HAVE | **CRITICAL** | 10 email functions | Value: `re_ZKnB58fY_JWGvTTkz1FDmV59gPLe8q6EV` |
| `LOVABLE_API_KEY` | ❌ Need | **CRITICAL** | 9 AI functions | Must obtain from Lovable support |
| `STRIPE_SECRET_KEY` | ✅ HAVE | **HIGH** | All Stripe functions | Provided separately |
| `STRIPE_WEBHOOK_SECRET` | ✅ HAVE | **HIGH** | Webhook handlers | Provided separately |
| `MAPBOX_PUBLIC_TOKEN` | ⚠️ Need to locate | **MEDIUM** | Geocoding/mapping | Used for location services |

### Auto-Provided by Supabase
- `SUPABASE_URL` - Automatically available
- `SUPABASE_ANON_KEY` - Automatically available
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically available
- `SUPABASE_DB_URL` - Automatically available

### Optional (SMS Features)
- `TWILIO_ACCOUNT_SID` - Not currently used
- `TWILIO_AUTH_TOKEN` - Not currently used
- `TWILIO_PHONE_NUMBER` - Not currently used

---

## Migration Priority

### Phase 1: Critical Infrastructure (Days 1-2)

**Goal:** Get basic platform running

1. ✅ Create new Supabase project
2. ✅ Connect Vercel to GitHub repository
3. ✅ Run ALL database migrations (tables, functions, triggers, policies)
4. ✅ Configure storage buckets + RLS policies
5. ✅ Configure required secrets (`RESEND_API_KEY`, Stripe keys)
6. ✅ Deploy all 62 edge functions
7. ✅ Update environment variables in Vercel
8. ✅ Update frontend Supabase client configuration

**Deliverable:** Platform loads, database connected, functions deployed

---

### Phase 2: Critical Path Testing (Days 2-3)

**Goal:** Verify core user flows work

1. ✅ Test OTP email delivery (CRITICAL - currently broken)
2. ✅ Test registration flow with email verification
3. ✅ Disable auto-confirm email once OTP works
4. ✅ Test authentication (login, logout, password reset)
5. ✅ Test role assignment and dashboard access
6. ✅ Test digger profile creation
7. ✅ Test gig posting
8. ✅ Test lead purchase flow (Stripe checkout)

**Deliverable:** Registration, auth, and basic marketplace flows functional

---

### Phase 3: Advanced Features (Days 3-4)

**Goal:** Verify marketplace mechanics

1. ✅ Test lead exclusivity queue logic
2. ✅ Test semi-exclusive lead conversion (24hr window)
3. ✅ Test lead credit balance system
4. ✅ Test bidding flow
5. ✅ Test messaging system
6. ✅ Test escrow contracts
7. ✅ Test Stripe webhooks (lead purchases, subscriptions)
8. ✅ Verify RLS policies protect data correctly

**Deliverable:** Full marketplace functionality verified

---

### Phase 4: AI Features (If LOVABLE_API_KEY Available)

**Goal:** Enable AI-powered features

1. ⚠️ Obtain `LOVABLE_API_KEY` from Lovable support
2. ⚠️ Configure key in Supabase secrets
3. ⚠️ Redeploy 9 AI-dependent functions
4. ⚠️ Test chatbot functionality
5. ⚠️ Test bio generation
6. ⚠️ Test keyword suggestions
7. ⚠️ Test semantic matching
8. ⚠️ Test auto-categorization

**Deliverable:** AI features functional (if key obtained)

---

## Current Workarounds in Place

### Workaround #1: Auto-Confirm Email
**File:** Supabase Auth Settings  
**Status:** Enabled to bypass OTP failure  
**Impact:** Users are NOT required to verify email  
**Action Required:** Disable once OTP email delivery works

### Workaround #2: Registration Skips Verification Step
**File:** `src/pages/Register.tsx` line 246  
**Code:** `setStep(3)` instead of `setStep(2)`  
**Impact:** Verification step bypassed entirely  
**Action Required:** Change to `setStep(2)` once OTP works

### Workaround #3: Supabase Client Fallback Values
**File:** `src/integrations/supabase/client.ts`  
**Status:** Hardcoded fallback for missing env vars  
**Impact:** None (defensive coding)  
**Action Required:** None (keep as-is for safety)

---

## Files Requiring Attention

### Critical Authentication Files
- `src/pages/Register.tsx` - Registration flow (line 246 needs fix)
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/integrations/supabase/client.ts` - Supabase client config
- `supabase/functions/send-otp-email/index.ts` - OTP delivery (BROKEN)
- `supabase/functions/verify-custom-otp/index.ts` - OTP verification

### Edge Functions Directory
- `supabase/functions/` - ALL 62 functions need deployment

### Configuration Files
- `.env` - Environment variables (auto-generated, do not edit)
- `supabase/config.toml` - Supabase configuration (auto-generated)
- `src/integrations/supabase/types.ts` - Database types (auto-generated)

---

## Testing Requirements

### Smoke Test Checklist (Minimum Acceptable)

#### Authentication
- [ ] User can register with email
- [ ] User receives OTP email
- [ ] User can verify OTP code
- [ ] User can login after verification
- [ ] User can logout
- [ ] User can reset password

#### Digger Flow
- [ ] Digger can create profile
- [ ] Digger can select keywords
- [ ] Digger can purchase lead credits
- [ ] Digger can browse gigs
- [ ] Digger can place bid

#### Gigger Flow
- [ ] Gigger can post gig
- [ ] Gigger can view bids
- [ ] Gigger can award bid

#### Payment Flow
- [ ] Stripe checkout session creates successfully
- [ ] Payment success redirects to confirmation
- [ ] Webhook processes payment correctly
- [ ] Lead credits are added to balance

---

## Migration Success Criteria

### Must Have (Minimum Viable Migration)
1. ✅ Platform loads without errors
2. ✅ OTP email delivery works (CRITICAL)
3. ✅ Registration flow completes successfully
4. ✅ Users can login and access dashboard
5. ✅ Diggers can create profiles
6. ✅ Giggers can post gigs
7. ✅ Stripe payments process successfully
8. ✅ Database queries execute correctly
9. ✅ RLS policies protect data

### Nice to Have (Enhanced Migration)
- ⚠️ AI features functional (requires `LOVABLE_API_KEY`)
- ⚠️ Chatbot operational
- ⚠️ Auto-categorization working
- ⚠️ Semantic matching enabled

---

## Support Resources

### Documentation Files in Repository
- `README_MIGRATION.md` - Migration overview
- `MIGRATION_QUICK_START.md` - Quick start guide
- `MIGRATION_CHECKLIST.md` - Step-by-step checklist
- `MIGRATION_INVENTORY.md` - Component inventory
- `SECRETS_REFERENCE.md` - Secrets documentation
- `FIXES_APPLIED.md` - Bug fix history
- `QA_DELIVERABLES.md` - Testing requirements

### Deployment Scripts
- `deploy-functions.sh` - Bash deployment script
- `deploy-functions.ps1` - PowerShell deployment script

---

## Known Platform Issues (Lovable Cloud)

1. **Secret Injection Failure** - Secrets not being injected into edge functions
2. **No Custom SMTP** - Cannot configure custom sending domains
3. **Limited Debugging** - Difficult to troubleshoot platform-level issues
4. **No Direct Database Access** - Cannot use SQL editor directly

**Reason for Migration:** These limitations are blocking critical functionality (OTP email delivery, AI features) and preventing production deployment.

---

## Questions for Hongqiang

1. **OTP Email Priority:** Can you prioritize getting OTP email delivery working first? This is blocking all registration.
2. **LOVABLE_API_KEY:** Should we proceed without AI features initially, or wait to obtain the key from Lovable?
3. **Mapbox Token:** Do you need the Mapbox token immediately, or can we add it after core migration?
4. **Timeline:** Based on this scope, does the $750 migration + $300 debugging budget still apply?

---

**End of Document**

*Last Updated: November 30, 2025*
