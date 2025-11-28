#!/bin/bash
# Supabase Edge Functions Deployment Script
# This script helps deploy all edge functions after secret configuration

echo "========================================"
echo "Supabase Edge Functions Deployment"
echo "========================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "✗ Supabase CLI not found. Please install it first."
    echo "  Install: npm install -g supabase"
    exit 1
fi

echo "✓ Supabase CLI found"
echo ""
echo "This script will deploy all edge functions."
echo "Make sure all secrets are configured in Supabase Dashboard first!"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Deploying all edge functions..."
echo ""

# Deploy all functions
if supabase functions deploy --all; then
    echo ""
    echo "✓ All functions deployed successfully!"
else
    echo ""
    echo "✗ Deployment failed. Check errors above."
    exit 1
fi

echo ""
echo "========================================"
echo "Next Steps:"
echo "1. Verify all secrets are set in Supabase Dashboard"
echo "2. Test critical functions (send-otp-email, chat-bot)"
echo "3. Check function logs for any errors"
echo "4. Disable auto-confirm email once OTP is working"
echo "========================================"

