# Pre-Launch Smoke Test Checklist v2

Run through these critical user flows manually to verify the site is ready for external QA testing.

**Last Updated:** December 2024  
**Known Issues:** Confirmation emails (OTP/Gig confirmations) are failing due to `RESEND_API_KEY` infrastructure issue. This will be resolved during Vercel migration.

---

## ✅ 1. Authentication & Registration (5 min)

### New User Sign-Up
- [ ] Navigate to /register
- [ ] Create account with email (test@example.com or similar)
- [ ] **KNOWN ISSUE:** Email confirmation may fail due to Resend API key issue
- [ ] If confirmation works: verify email confirmation (check inbox)
- [ ] If confirmation fails: note the issue and proceed (will be fixed in migration)
- [ ] Successfully reach role selection screen or dashboard

### Sign-In & Sign-Out
- [ ] Sign out using navigation menu
- [ ] Sign back in with same credentials
- [ ] Password is remembered and works
- [ ] Redirected to role dashboard after login
- [ ] "Forgot Password" link exists

**Critical Blocker**: If you cannot register or login, **STOP** - fix authentication first.

---

## ✅ 2. Digger Profile Creation (7 min)

### Single Profile Setup
- [ ] Select "Digger" role during registration
- [ ] Navigate to "Create a new Digs" from dashboard
- [ ] Enter mandatory Profile Name field (e.g., "HVAC Services Profile")
- [ ] Click "Browse Categories" to select profession/specialty
- [ ] Select a category (e.g., "Home Services" → "HVAC")
- [ ] Describe specialty or select from suggestions
- [ ] See AI-generated keyword suggestions appear
- [ ] Select keywords relevant to your profession
- [ ] Click "Use X Selected Keywords"
- [ ] Return to profile creation page with keywords populated
- [ ] Complete remaining fields:
  - Business name
  - Location/zipcode
  - Phone number
  - Service area (zip codes OR radius in miles)
  - Country selection
  - Hourly rate (optional)
- [ ] Click "Save Profile"
- [ ] Profile appears in "My Profiles" section

### Multiple Profile Creation
- [ ] From "My Profiles" page, click "+ Create a New Profile"
- [ ] Repeat profile creation steps with different Profile Name
- [ ] Select different category/specialty/keywords for second profile
- [ ] Save second profile
- [ ] Both profiles appear in "My Profiles" list with distinct names

### Profile Editing & Keyword Management
- [ ] Click on an existing profile name in "My Profiles" list
- [ ] View profile detail page
- [ ] Click "Manage Keywords" button
- [ ] Add new keywords or remove existing ones
- [ ] Click "Use X Selected Keywords" to save changes
- [ ] Return to profile detail page
- [ ] Verify keywords were updated

**Critical Blocker**: If profile creation fails, profile doesn't save, or multiple profiles can't be created, note for immediate fix.

---

## ✅ 3. Gig Posting - NEW 3-Step Wizard (10 min)

### Step 1: Basic Information
- [ ] Navigate to /post-gig or click "Post a Gig" button
- [ ] See "Step 1 of 3: Basic Information" header
- [ ] Enter detailed gig description:
  - Describe the professional you need (e.g., "I need an HVAC contractor to install a new AC unit")
  - Include location context (e.g., "in downtown Los Angeles")
- [ ] Enter zipcode (e.g., 90001)
- [ ] Enter contact email
- [ ] Enter contact phone
- [ ] Click "Next: Project Details"

### Step 2: Project Details
- [ ] See "Step 2 of 3: Project Details" header
- [ ] **AI Category Detection:**
  - Verify AI detected category appears automatically (e.g., "HVAC Installation")
  - Category should match your Step 1 description
- [ ] **Industry-Specific Intake Form:**
  - See industry-specific questions appear for detected category
  - Fill out intake form questions (e.g., for HVAC: home size, current system type, etc.)
- [ ] **Project Details Section:**
  - Enter project title (e.g., "New AC Installation - 3BR Home")
  - Enter detailed project description (or use AI enhancement)
  - **AI Enhance Description:**
    - Click "AI Enhance Description" button (optional)
    - Review AI-generated professional description
    - Accept or reject the enhancement
  - Enter budget range (min/max) or leave blank
  - Select service timeline (e.g., "Within 1 week", "1-2 weeks", "Flexible")
  - Check "Hourly Basis" if work is hourly
- [ ] **Contact Preferences:**
  - Select contact method from dropdown: "Email only", "Phone preferred", "Text messages OK", "Email and Phone", or "Any method"
- [ ] Click "Next: Keywords & Submission"

### Step 3: Keywords, Escrow, T&C, Preview & Submit
- [ ] See "Step 3 of 3: Keywords, Escrow & Submission" header
- [ ] **AI-Suggested Keywords:**
  - See AI-generated keyword suggestions based on gig description AND location (zipcode from Step 1)
  - Keywords should be geographically relevant (e.g., "HVAC Los Angeles", "AC repair 90001")
  - Select relevant keywords from suggestions
  - **Add Custom Keywords:**
    - Click "Add Keyword" button
    - Enter custom keyword (e.g., "emergency HVAC")
    - Custom keyword appears in selection list
- [ ] **Request Escrow Protection (NEW):**
  - See "Request Escrow Protection" checkbox before Terms and Conditions
  - Read escrow explanation text
  - **Warning About Higher Bids:**
    - Verify warning appears: "Requesting escrow may result in higher bids (approximately 8% more) as Diggers typically adjust their pricing to cover escrow fees."
  - Check or uncheck escrow based on preference
- [ ] **Terms and Conditions:**
  - See T&C checkbox (required)
  - Expand collapsible T&C section to read terms
  - Check T&C acceptance checkbox
  - Verify "Preview Gig" button becomes enabled
- [ ] **Preview Gig:**
  - Click "Preview Gig" button
  - See comprehensive gig preview display showing:
    - Gig title
    - AI-enhanced description (if used)
    - Location (zipcode)
    - Timeline
    - Budget (if provided)
    - Contact information (email, phone, contact preference)
    - Selected keywords
    - Escrow status (if requested)
    - All intake form answers
  - Review all details for accuracy
- [ ] **Submit for Confirmation:**
  - Click "Submit for Confirmation" button (appears after preview)
  - See success message
  - **KNOWN ISSUE:** Confirmation email may NOT be sent due to Resend API key problem
  - If email arrives: check inbox for gig confirmation email with full details
  - If email doesn't arrive: note the issue (will be fixed during migration)
- [ ] **Gig Status:**
  - Gig should be saved with `pending_confirmation` status in database
  - Gig should NOT appear in Browse Gigs marketplace yet (confirmation required first)
  - Navigate to "My Gigs" page
  - Verify posted gig appears with "Pending Confirmation" status

**Critical Blocker**: If gig submission fails, AI category detection fails, or keywords aren't location-aware, note for immediate fix. The confirmation email issue is a KNOWN blocker that will be resolved during migration.

---

## ✅ 4. Lead Purchase Flow (5 min)

### Buy Leads (Digger)
- [ ] Navigate to Browse Gigs as a Digger
- [ ] **Escrow Filter:**
  - See "Show Escrow Gigs" checkbox toggle
  - Toggle checkbox to show/hide escrow-required gigs
  - Verify gigs with escrow display "🔒 Escrow Required" badge
- [ ] Select a gig/lead to purchase
- [ ] View pricing tiers:
  - Non-Exclusive (Bark price - $1.00)
  - Semi-Exclusive ((Bark price - $1.00) × 2)
  - 24hr Exclusive (Semi-Exclusive × 2.5)
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
- [ ] Open a confirmed gig detail page
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
- [ ] "MY DASHBOARD" button appears in main navigation (when logged in)
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
  - /post-gig (new 3-step wizard)
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
- [ ] Previously created profile(s) still exist
- [ ] Previously posted gig still exists (even if pending confirmation)
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
  - ⚠️ Expect Resend API 401 errors (known issue)
  - ✅ Other warnings are acceptable if app functions correctly

**Critical Blocker**: If repeated red errors appear preventing functionality (other than Resend), investigate and fix.

---

## 📊 Smoke Test Results

**Total Tests**: 8 sections  
**Passed**: ___  
**Failed**: ___  
**Blockers Found**: ___

### Decision Matrix

| Passed Tests | Recommendation |
|-------------|---------------|
| 8/8 (with email issue noted) | ✅ **READY FOR MIGRATION** - Proceed with Hongqiang's Vercel/Supabase migration |
| 6-7/8 | ⚠️ **MOSTLY READY** - Fix minor issues, then proceed |
| 4-5/8 | ⏸️ **NOT READY** - Fix critical blockers first |
| 0-3/8 | 🛑 **STOP** - Major issues, significant work needed |

---

## 🚀 Next Steps After Passing

1. **Document known issues** - Confirmation email issue is documented (will be fixed in migration)
2. **Share results with Hongqiang** - Provide this checklist with results before migration starts
3. **Prepare test credentials** - Set up dummy accounts for Hongqiang to use during migration testing
4. **Prepare test data** - Create sample gigs, profiles, keywords for migration verification
5. **Kick off migration** - Authorize Hongqiang to begin Lovable → Vercel/Supabase migration ($1,050)

---

## 📝 Notes Section

Use this space to document issues found during smoke testing:

**Known Blockers (Will Be Fixed in Migration):**
- ❌ Confirmation emails (OTP/Gig confirmations) failing due to `RESEND_API_KEY` infrastructure issue
- This is a Lovable Cloud secret injection problem, not a code issue
- Will be resolved when Hongqiang migrates to Vercel + external Supabase with proper SMTP configuration

**New Blockers (Must Fix Before Migration):**
- 

**Minor Issues:**
- 

**Questions for AI/Development:**
- 

---

## 🎯 Focus Areas for This Test

This smoke test specifically validates:
1. **NEW 3-Step Gig Posting Wizard** with AI category detection and location-aware keywords
2. **NEW Escrow checkbox** on Step 3 with cost warnings
3. **Multiple Digger Profile Creation** with profile name requirement
4. **Location-Aware Keyword Generation** based on zipcode
5. **AI Enhanced Description** feature
6. **Gig Preview** before confirmation submission
7. **Contact Preferences** dropdown instead of free-form text

All new features implemented since the original smoke test checklist.