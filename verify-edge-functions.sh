#!/bin/bash

# Edge Functions Verification Script
# This script tests all new and updated Edge Functions

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://YOUR_PROJECT.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY:-YOUR_ANON_KEY}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-YOUR_SERVICE_KEY}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Edge Functions Verification Script"
echo "=========================================="
echo ""

# Function to test an Edge Function
test_function() {
    local function_name=$1
    local method=$2
    local body=$3
    local requires_auth=$4
    
    echo -n "Testing $function_name... "
    
    local headers=(
        "-H" "Content-Type: application/json"
    )
    
    if [ "$requires_auth" = "true" ]; then
        headers+=("-H" "Authorization: Bearer $ANON_KEY")
    fi
    
    local response
    if [ -n "$body" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$SUPABASE_URL/functions/v1/$function_name" \
            "${headers[@]}" \
            -d "$body")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$SUPABASE_URL/functions/v1/$function_name" \
            "${headers[@]}")
    fi
    
    local http_code=$(echo "$response" | tail -n1)
    local body_response=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "400" ]; then
        echo -e "${YELLOW}⚠️  PARTIAL${NC} (HTTP $http_code - May need valid data)"
        echo "   Response: $body_response"
        return 1
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
        echo "   Response: $body_response"
        return 1
    fi
}

# Test new functions
echo "=== Testing New Functions ==="
echo ""

# 1. screen-message (no auth required)
test_function "screen-message" "POST" '{"message":"This is a test message","senderType":"gigger"}' false

# 2. enhance-gig-description (no auth required)
test_function "enhance-gig-description" "POST" '{"description":"I need a website built","problemLabel":"Web Development"}' false

# 3. charge-referral-fee (requires auth, needs valid IDs)
echo -n "Testing charge-referral-fee... "
response=$(curl -s -w "\n%{http_code}" -X POST \
    "$SUPABASE_URL/functions/v1/charge-referral-fee" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d '{"bidId":"test","gigId":"test","diggerId":"test"}')
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "400" ]; then
    echo -e "${YELLOW}⚠️  PARTIAL${NC} (HTTP $http_code - Expected with test data)"
else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi

# 4. digger-accept-award (requires auth, needs valid IDs)
echo -n "Testing digger-accept-award... "
response=$(curl -s -w "\n%{http_code}" -X POST \
    "$SUPABASE_URL/functions/v1/digger-accept-award" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d '{"bidId":"test","gigId":"test","diggerId":"test"}')
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "400" ] || [ "$http_code" = "401" ]; then
    echo -e "${YELLOW}⚠️  PARTIAL${NC} (HTTP $http_code - Expected with test data)"
else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi

# 5. send-anonymous-question (requires auth, needs valid IDs)
echo -n "Testing send-anonymous-question... "
response=$(curl -s -w "\n%{http_code}" -X POST \
    "$SUPABASE_URL/functions/v1/send-anonymous-question" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d '{"gigId":"test","bidId":"test","diggerId":"test","message":"This is a test question"}')
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "400" ] || [ "$http_code" = "401" ]; then
    echo -e "${YELLOW}⚠️  PARTIAL${NC} (HTTP $http_code - Expected with test data)"
else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi

echo ""
echo "=== Testing Updated Functions ==="
echo ""

# Test updated functions (they should still work)
test_function "verify-gig-confirmation" "GET" "" false
test_function "send-gig-management-email" "POST" '{"gigId":"test"}' false

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Note: Functions requiring valid database IDs may return 400 errors."
echo "This is expected behavior. Verify with real data in your application."
