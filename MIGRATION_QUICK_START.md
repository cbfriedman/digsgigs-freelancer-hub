# Migration Quick Start Guide

This is a condensed guide for quickly migrating the Digs and Gigs platform to a new Supabase project.

## ⚡ Quick Checklist

### 1. Pre-Migration (5 minutes)
- [ ] Backup current database
- [ ] Note current project ID: `ibyhvkfrbdwrnxutnkdy`
- [ ] Gather all API keys (see SECRETS_REFERENCE.md)

### 2. Create New Project (2 minutes)
- [ ] Create new Supabase project
- [ ] Note new project ID
- [ ] Update `supabase/config.toml` with new project ID

### 3. Configure Secrets (10 minutes) ⚠️ CRITICAL
Go to: **Supabase Dashboard → Settings → Edge Functions → Secrets**

Add these secrets (in order of priority):

1. **RESEND_API_KEY** ⚠️ (Fixes OTP email issue)
2. **LOVABLE_API_KEY** ⚠️ (Fixes AI features)
3. **STRIPE_SECRET_KEY**
4. **STRIPE_WEBHOOK_SECRET**
5. **TWILIO_ACCOUNT_SID** (if using SMS)
6. **TWILIO_AUTH_TOKEN** (if using SMS)
7. **TWILIO_PHONE_NUMBER** (if using SMS)
8. **MAPBOX_ACCESS_TOKEN** (if using mapping)

### 4. Deploy Database (5 minutes)
```bash
supabase db push
```

Verify:
- [ ] All tables created
- [ ] All RLS policies enabled
- [ ] All database functions created

### 5. Deploy Edge Functions (10 minutes)
```bash
# Option 1: Deploy all at once
supabase functions deploy --all

# Option 2: Use deployment script
./deploy-functions.sh  # Linux/Mac
# or
.\deploy-functions.ps1  # Windows
```

### 6. Fix Known Issues (15 minutes)

#### Fix OTP Email (Issue #1)
1. Verify `RESEND_API_KEY` is set in secrets
2. Redeploy `send-otp-email`:
   ```bash
   supabase functions deploy send-otp-email
   ```
3. Test with sample request
4. Check function logs for errors

#### Fix LOVABLE_API_KEY (Issue #2)
1. Verify `LOVABLE_API_KEY` is set in secrets
2. Redeploy all affected functions:
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

#### Fix Auto-Confirm Email (Issue #3)
1. Once OTP emails are working, go to:
   **Supabase Dashboard → Authentication → Settings**
2. Disable "Enable email confirmations" or set appropriately
3. Test registration flow

### 7. Test Critical Features (20 minutes)
- [ ] User registration (with OTP email)
- [ ] User login
- [ ] Payment processing (Stripe)
- [ ] Lead matching
- [ ] AI chatbot
- [ ] Email notifications
- [ ] Blog generation

### 8. Update Application (5 minutes)
- [ ] Update `.env` files with new Supabase URL
- [ ] Update `SUPABASE_URL` in application config
- [ ] Update `SUPABASE_ANON_KEY` in application config
- [ ] Update any hardcoded project references

### 9. Final Verification (10 minutes)
- [ ] Check all function logs for errors
- [ ] Test end-to-end user flows
- [ ] Verify all secrets are accessible
- [ ] Monitor for any runtime errors

---

## 🚨 Critical Issues to Fix

### Issue 1: OTP Email Not Working
**Status:** ⚠️ Currently failing  
**Fix:** Configure `RESEND_API_KEY` secret and redeploy `send-otp-email`  
**Impact:** Users cannot verify email addresses

### Issue 2: AI Features Not Working
**Status:** ⚠️ Currently failing  
**Fix:** Configure `LOVABLE_API_KEY` secret and redeploy 9 affected functions  
**Impact:** Chatbot, blog generation, and AI matching features broken

### Issue 3: Auto-Confirm Email Enabled
**Status:** ⚠️ Workaround active  
**Fix:** Disable after fixing Issue #1  
**Impact:** Users bypass email verification (security concern)

---

## 📊 Migration Statistics

- **Edge Functions:** 62 total (13 Lead Management, 13 Payments, 7 AI/Matching, 8 Notifications, 3 Escrow, 3 Blog, 3 Auth, 7 Utility)
- **Database Tables:** 47 total with RLS policies
- **Database Functions:** 27 total
- **Storage Buckets:** 3
- **Secrets Required:** 10 (2 critical for current issues)
- **Migrations:** 95 SQL files

---

## 🔧 Troubleshooting

### Functions not working after deployment
1. Check secrets are set correctly
2. Redeploy functions after setting secrets
3. Check function logs in Supabase dashboard
4. Verify secret names match exactly (case-sensitive)

### Database migration fails
1. Check migration order
2. Verify no conflicting migrations
3. Check for missing dependencies
4. Review error messages in migration logs

### Secrets not accessible
1. Verify secret name matches exactly
2. Redeploy function after adding secret
3. Check function logs for undefined errors
4. Verify you're using correct project

---

## 📚 Full Documentation

- **MIGRATION_CHECKLIST.md** - Complete detailed checklist
- **SECRETS_REFERENCE.md** - All secrets with setup instructions
- **deploy-functions.sh/ps1** - Deployment helper scripts

---

## ⏱️ Estimated Total Time

- **Minimum:** 1-2 hours (if everything goes smoothly)
- **Realistic:** 2-4 hours (with testing and fixes)
- **With Issues:** 4-8 hours (if troubleshooting needed)

---

## ✅ Success Criteria

Migration is complete when:
- [ ] All edge functions deployed successfully
- [ ] All secrets configured and working
- [ ] OTP emails are being sent
- [ ] AI features are working
- [ ] Payment processing works
- [ ] No errors in function logs
- [ ] Application connects to new project
- [ ] All critical user flows tested

---

**Need Help?** Refer to:
- MIGRATION_CHECKLIST.md for detailed steps
- SECRETS_REFERENCE.md for secret configuration
- Supabase documentation: https://supabase.com/docs

---

**Last Updated:** 2024-12-19

