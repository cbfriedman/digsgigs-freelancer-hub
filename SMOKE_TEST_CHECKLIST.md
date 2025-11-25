# Pre-Launch Smoke Test Checklist

Run through these critical user flows manually to verify the site is ready for external QA testing.

---

## ✅ 1. Authentication & Registration (5 min)

### New User Sign-Up
- [ ] Navigate to /register
- [ ] Create account with email (test@example.com or similar)
- [ ] Verify email confirmation works (check inbox or auto-confirm is enabled)
- [ ] Complete verification process (OTP if required)
- [ ] Successfully reach role selection screen

### Sign-In & Sign-Out
- [ ] Sign out using navigation menu
- [ ] Sign back in with same credentials
- [ ] Password is remembered and works
- [ ] Redirected to appropriate dashboard after login
- [ ] "Forgot Password" link exists and triggers recovery email

**Critical Blocker**: If you cannot register or login, **STOP** - fix authentication first.

---

## ✅ 2. Digger Profile Creation (5 min)

### Profile Setup
- [ ] Select "Digger" role during registration
- [ ] Complete Digger registration form (business name, location, phone, profession)
- [ ] Upload profile photo (if implemented)
- [ ] Add at least one profession/specialty
- [ ] Add keywords or select from AI suggestions
- [ ] Save profile successfully
- [ ] Profile appears in "My Profiles" section

### Browse Categories
- [ ] Navigate to Browse Categories
- [ ] View profession categories
- [ ] Add custom category (if feature exists)
- [ ] Custom category appears only for your account

**Critical Blocker**: If profile creation fails or profile doesn't save, note for immediate fix.

---

## ✅ 3. Gigger Gig Posting (5 min)

### Post a Gig
- [ ] Navigate to /post-gig or "Post a Gig" button
- [ ] Fill out gig form:
  - Title
  - Description
  - Location
  - Budget (min/max)
  - Deadline
  - Category
- [ ] Upload images (optional, if implemented)
- [ ] Submit gig successfully
- [ ] Gig appears in "My Gigs" page
- [ ] Gig is visible in Browse Gigs marketplace

**Critical Blocker**: If gig submission fails or gig doesn't appear, note for immediate fix.

---

## ✅ 4. Lead Purchase Flow (5 min)

### Buy Leads (Digger)
- [ ] Navigate to Browse Gigs as a Digger
- [ ] Select a gig/lead to purchase
- [ ] View pricing tiers (Non-Exclusive, Semi-Exclusive, 24hr Exclusive)
- [ ] Pricing displays correctly for each keyword
- [ ] Select lead type and quantity
- [ ] See total cost calculation
- [ ] Proceed to checkout (Stripe integration)
- [ ] **If Stripe test mode:** Use test card 4242 4242 4242 4242
- [ ] Payment processes without errors
- [ ] Lead appears in "My Leads" page

**Critical Blocker**: If payment fails, Stripe isn't configured, or leads don't appear after purchase, note for immediate fix.

---

## ✅ 5. Bidding Flow (5 min)

### Place a Bid (Digger)
- [ ] Navigate to Browse Gigs
- [ ] Open a gig detail page
- [ ] Fill out bid form:
  - Bid amount
  - Timeline
  - Proposal description
- [ ] Submit bid successfully
- [ ] Bid appears in "My Bids" page
- [ ] Bid status shows as "pending"

### Review Bids (Gigger)
- [ ] Navigate to "My Gigs" as Gigger
- [ ] Open a gig that has received bids
- [ ] View list of bids
- [ ] Accept or reject a bid (if implemented)
- [ ] Bid status updates correctly

**Critical Blocker**: If bids cannot be submitted or viewed, note for immediate fix.

---

## ✅ 6. Navigation & UI (3 min)

### Core Navigation
- [ ] Home page loads without errors
- [ ] Navigation menu displays correctly
- [ ] User ID and role icons appear in nav (when logged in)
- [ ] All main pages load:
  - /role-dashboard
  - /browse-gigs
  - /browse-diggers
  - /my-gigs
  - /my-leads
  - /my-bids
  - /my-profiles
  - /pricing
  - /how-it-works
- [ ] Footer links work
- [ ] Mobile responsive menu functions (if testing on mobile)

### Error Handling
- [ ] Navigate to invalid URL (e.g., /nonexistent-page)
- [ ] 404 page displays with Home button and logo
- [ ] Click Home button to return to homepage

**Critical Blocker**: If major pages fail to load or show blank screens, note for immediate fix.

---

## ✅ 7. Database Persistence (2 min)

### Data Persistence
- [ ] Sign out
- [ ] Sign back in
- [ ] Previously created profile still exists
- [ ] Previously posted gig still exists
- [ ] Previously purchased leads still visible
- [ ] Previously placed bids still visible

**Critical Blocker**: If data disappears after logout/login, database or RLS policies need fixing.

---

## ✅ 8. Console Errors Check (2 min)

### Browser Console
- [ ] Open browser DevTools (F12)
- [ ] Navigate through main pages
- [ ] Check Console tab for critical errors:
  - ❌ Red errors related to authentication
  - ❌ Red errors related to database queries
  - ❌ Failed network requests to Supabase
  - ✅ Warnings are acceptable if app functions correctly

**Critical Blocker**: If repeated red errors appear preventing functionality, investigate and fix.

---

## 📊 Smoke Test Results

**Total Tests**: 8 sections  
**Passed**: ___  
**Failed**: ___  
**Blockers Found**: ___

### Decision Matrix

| Passed Tests | Recommendation |
|-------------|---------------|
| 8/8 | ✅ **READY** - Proceed with freelancer QA |
| 6-7/8 | ⚠️ **MOSTLY READY** - Fix minor issues, then proceed |
| 4-5/8 | ⏸️ **NOT READY** - Fix critical blockers first |
| 0-3/8 | 🛑 **STOP** - Major issues, significant work needed |

---

## 🚀 Next Steps After Passing

1. **Document known issues** - List any minor bugs found during smoke test
2. **Create test accounts** - Set up dummy accounts for freelancers to use
3. **Prepare test data** - Create sample gigs, profiles, keywords for testing
4. **Post freelancer job** - Upload `FREELANCER_JOB_POSTING.md` and `QA_DELIVERABLES.md`
5. **Provide test credentials** - Share test account login info with freelancers

---

## 📝 Notes Section

Use this space to document issues found during smoke testing:

**Blockers:**
- 

**Minor Issues:**
- 

**Questions for AI/Development:**
- 
