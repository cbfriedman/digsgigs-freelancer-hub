#!/bin/bash
# Bash Script to Test Edge Functions
# This script helps test the send-otp-email and verify-custom-otp functions

EMAIL="${1:-test@example.com}"
ANON_KEY="${2:-}"
PROJECT_REF="${3:-njpjxasfesdapxukvyth}"

echo "========================================"
echo "Edge Functions Testing Script"
echo "========================================"
echo ""

# Check if anon key is provided
if [ -z "$ANON_KEY" ]; then
    echo "⚠️  Anon key not provided."
    read -p "Enter your Supabase Anon Key (or press Enter to skip): " ANON_KEY
fi

if [ -z "$ANON_KEY" ]; then
    echo "❌ Anon key is required for testing. Exiting."
    exit 1
fi

BASE_URL="https://${PROJECT_REF}.supabase.co/functions/v1"

echo "Testing with:"
echo "  Email: $EMAIL"
echo "  Project: $PROJECT_REF"
echo ""

# Test 1: Send OTP Email
echo "Test 1: Sending OTP Email..."
OTP_CODE=$(shuf -i 100000-999999 -n 1)

SEND_OTP_RESPONSE=$(curl -s -X POST "${BASE_URL}/send-otp-email" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"code\": \"${OTP_CODE}\",
    \"name\": \"Test User\"
  }")

if [ $? -eq 0 ]; then
    echo "✅ OTP Email sent successfully!"
    echo "   Code sent: ${OTP_CODE}"
    echo "   Response: ${SEND_OTP_RESPONSE}"
    echo ""
    
    # Wait a bit for email to be sent
    echo "⏳ Waiting 3 seconds for email delivery..."
    sleep 3
    
    # Test 2: Verify OTP Code
    echo "Test 2: Verifying OTP Code..."
    VERIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/verify-custom-otp" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"${EMAIL}\",
        \"code\": \"${OTP_CODE}\"
      }")
    
    if [ $? -eq 0 ]; then
        echo "✅ OTP Code verified successfully!"
        echo "   Response: ${VERIFY_RESPONSE}"
        echo ""
    else
        echo "❌ Verification failed"
        echo "   Response: ${VERIFY_RESPONSE}"
        echo ""
    fi
    
    # Test 3: Test Invalid Code
    echo "Test 3: Testing Invalid Code (should fail)..."
    INVALID_RESPONSE=$(curl -s -X POST "${BASE_URL}/verify-custom-otp" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"${EMAIL}\",
        \"code\": \"999999\"
      }")
    
    if echo "$INVALID_RESPONSE" | grep -q "error"; then
        echo "✅ Invalid code correctly rejected"
        echo "   Response: ${INVALID_RESPONSE}"
    else
        echo "⚠️  Unexpected success with invalid code"
        echo "   Response: ${INVALID_RESPONSE}"
    fi
    echo ""
    
else
    echo "❌ Failed to send OTP email"
    echo "   Response: ${SEND_OTP_RESPONSE}"
    echo ""
fi

echo "========================================"
echo "Testing Complete!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Check your email inbox for the OTP code"
echo "2. Verify code is stored in verification_codes table"
echo "3. Check function logs in Supabase Dashboard"
echo ""




