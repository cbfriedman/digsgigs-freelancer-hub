# Secrets Configuration Reference

This document provides a quick reference for all secrets that need to be configured in Supabase.

## Quick Setup

Navigate to: **Supabase Dashboard → Settings → Edge Functions → Secrets**

## Required Secrets

### 1. RESEND_API_KEY ⚠️ CRITICAL
- **Purpose:** Email delivery via Resend API
- **Used By:** 10 edge functions
- **How to Get:** 
  1. Sign up at https://resend.com
  2. Create API key in dashboard
  3. Copy API key
- **Functions Using This:**
  - `send-otp-email` ⚠️ (Currently failing)
  - `send-transaction-report`
  - `send-lead-confirmation`
  - `send-monthly-reports`
  - `send-notification-digest`
  - `send-bid-notification`
  - `notify-keyword-request`
  - `send-profile-reminders`
  - `send-saved-search-alerts`
  - `check-upgrade-savings`

**Current Issue:** Secret not being injected properly. After adding secret, redeploy affected functions.

---

### 2. LOVABLE_API_KEY ⚠️ CRITICAL
- **Purpose:** AI features via Lovable AI Gateway
- **Used By:** 9 edge functions
- **How to Get:**
  1. Sign up at Lovable.dev
  2. Get API key from dashboard
  3. Copy API key
- **Functions Using This:**
  - `chat-bot` ⚠️ (Currently not working)
  - `generate-blog-post` ⚠️
  - `match-industry-codes` ⚠️
  - `generate-step-image` ⚠️
  - `generate-profile-suggestions` ⚠️
  - `generate-bio` ⚠️
  - `match-diggers-semantic` ⚠️
  - `suggest-keywords-from-description` ⚠️
  - `verify-lead-match` ⚠️

**Current Issue:** Secret not being injected. After adding secret, redeploy all affected functions.

---

### 3. SUPABASE_URL
- **Purpose:** Supabase project URL
- **Status:** Automatically available in edge functions
- **Note:** Usually in format: `https://[project-ref].supabase.co`
- **Action:** Verify it's accessible in functions (should work automatically)

---

### 4. SUPABASE_SERVICE_ROLE_KEY
- **Purpose:** Service role key for admin operations
- **Status:** Automatically available in edge functions
- **Note:** Found in Settings → API → service_role key
- **Action:** Verify it's accessible in functions (should work automatically)
- **⚠️ Security:** Never expose this key in client-side code

---

### 5. STRIPE_SECRET_KEY
- **Purpose:** Stripe API secret key for payment processing
- **Used By:** All Stripe-related functions
- **How to Get:**
  1. Sign up at https://stripe.com
  2. Go to Developers → API keys
  3. Copy Secret key (starts with `sk_`)
- **Functions Using This:**
  - All checkout functions
  - All webhook handlers
  - Payment processing functions

---

### 6. STRIPE_WEBHOOK_SECRET
- **Purpose:** Stripe webhook signing secret
- **Used By:** All Stripe webhook handlers
- **How to Get:**
  1. In Stripe Dashboard → Developers → Webhooks
  2. Create or select webhook endpoint
  3. Copy Signing secret
- **Functions Using This:**
  - `stripe-webhook`
  - `stripe-webhook-lead-purchase`
  - `stripe-webhook-profile-view`
  - `stripe-webhook-profession-purchase`
  - `stripe-webhook-extension`

---

### 7. TWILIO_ACCOUNT_SID
- **Purpose:** Twilio account SID for SMS
- **Used By:** `send-lead-confirmation` (SMS functionality)
- **How to Get:**
  1. Sign up at https://twilio.com
  2. Copy Account SID from dashboard
- **Status:** Optional (only if SMS features are needed)

---

### 8. TWILIO_AUTH_TOKEN
- **Purpose:** Twilio authentication token
- **Used By:** `send-lead-confirmation` (SMS functionality)
- **How to Get:**
  1. In Twilio Dashboard
  2. Copy Auth Token
- **Status:** Optional (only if SMS features are needed)

---

### 9. TWILIO_PHONE_NUMBER
- **Purpose:** Twilio phone number for sending SMS
- **Used By:** `send-lead-confirmation` (SMS functionality)
- **How to Get:**
  1. In Twilio Dashboard → Phone Numbers
  2. Purchase or use existing number
  3. Copy phone number (E.164 format)
- **Status:** Optional (only if SMS features are needed)

---

### 10. MAPBOX_ACCESS_TOKEN
- **Purpose:** Mapbox API token for geocoding/mapping
- **Used By:** Geocoding utilities
- **How to Get:**
  1. Sign up at https://mapbox.com
  2. Go to Account → Access tokens
  3. Create or copy token
- **Status:** Optional (only if mapping features are needed)

---

## Secret Injection Issues

### Problem: Secrets Not Being Injected

If secrets are not being injected into edge functions:

1. **Verify Secret is Set:**
   - Go to Supabase Dashboard → Settings → Edge Functions → Secrets
   - Confirm secret name matches exactly (case-sensitive)
   - Verify secret value is correct

2. **Redeploy Functions:**
   After adding/updating secrets, you MUST redeploy the functions:
   ```bash
   # Deploy specific function
   supabase functions deploy <function-name>
   
   # Or deploy all functions
   supabase functions deploy --all
   ```

3. **Check Function Logs:**
   - Go to Edge Functions → Select function → Logs
   - Look for errors about missing environment variables
   - Check if secret is undefined

4. **Verify Secret Name:**
   - Secret names must match exactly what's in code
   - Example: `RESEND_API_KEY` not `resend_api_key` or `ResendApiKey`

---

## Testing Secrets

### Test RESEND_API_KEY
```bash
# Test send-otp-email function
curl -X POST https://[project-ref].supabase.co/functions/v1/send-otp-email \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'
```

### Test LOVABLE_API_KEY
```bash
# Test chat-bot function
curl -X POST https://[project-ref].supabase.co/functions/v1/chat-bot \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], "userId": "test"}'
```

---

## Secret Security Best Practices

1. **Never commit secrets to git**
   - Use `.env` files (gitignored)
   - Use Supabase secrets management
   - Use environment variables in CI/CD

2. **Rotate secrets regularly**
   - Update secrets periodically
   - Revoke old keys after rotation
   - Update in Supabase dashboard

3. **Use different secrets for dev/staging/prod**
   - Separate Supabase projects per environment
   - Different API keys per environment

4. **Monitor secret usage**
   - Check function logs for secret-related errors
   - Monitor API usage in external services
   - Set up alerts for unusual activity

---

## Troubleshooting

### Secret exists but function says it's undefined

**Solution:**
1. Verify secret name matches exactly (case-sensitive)
2. Redeploy the function after adding secret
3. Check function logs for exact error message
4. Verify you're using the correct project

### Function works locally but not in production

**Solution:**
1. Ensure secret is set in production Supabase project
2. Redeploy function to production
3. Check production function logs
4. Verify environment is correct

### Multiple functions failing with same secret

**Solution:**
1. Verify secret is set correctly in dashboard
2. Redeploy all affected functions
3. Check if secret has expired or been revoked
4. Verify API key is still valid in external service

---

## Quick Command Reference

```bash
# List all secrets (via Supabase CLI)
supabase secrets list

# Set a secret
supabase secrets set SECRET_NAME=secret_value

# Deploy function after setting secret
supabase functions deploy <function-name>

# Deploy all functions
supabase functions deploy --all

# View function logs
supabase functions logs <function-name>
```

---

**Last Updated:** 2024-12-19

