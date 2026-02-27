#!/bin/bash
# Deployment Script for Digs and Gigs Platform
# Bash script for Linux/Mac

echo "🚀 Starting Deployment Process..."

# Step 1: Deploy Database Migrations
echo ""
echo "📦 Step 1: Deploying Database Migrations..."
if supabase db push; then
    echo "✅ Migrations deployed successfully"
else
    echo "❌ Migration deployment failed"
    exit 1
fi

# Step 2: Deploy Edge Functions
echo ""
echo "⚡ Step 2: Deploying Edge Functions..."
functions=(
    "send-otp"
    "verify-custom-otp"
    "create-auth-user"
    "send-welcome-email"
    "record-email-unsubscribe"
    "create-lead-purchase-checkout"
    "award-lead"
    "match-leads-to-diggers"
    "stripe-webhook-lead-purchase"
    "add-milestone"
    "create-payment-contract"
    "charge-milestone"
    "confirm-milestone-session"
    "submit-milestone"
    "end-contract"
)

for func in "${functions[@]}"; do
    echo "  Deploying $func..."
    if supabase functions deploy "$func"; then
        echo "  ✅ $func deployed"
    else
        echo "  ❌ $func deployment failed"
    fi
done

# Step 3: Build Frontend
echo ""
echo "🏗️  Step 3: Building Frontend..."
if npm run build; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

# Step 4: Deploy to Vercel
echo ""
echo "🌐 Step 4: Deploying to Vercel..."
echo "⚠️  Note: Make sure you're logged into Vercel CLI"
echo "   Run: vercel login (if not already logged in)"

read -p "Deploy to Vercel now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if vercel --prod; then
        echo "✅ Frontend deployed to Vercel"
    else
        echo "❌ Vercel deployment failed"
        echo "   You can deploy manually by pushing to GitHub"
    fi
else
    echo "⏭️  Skipping Vercel deployment"
    echo "   Deploy manually: vercel --prod or push to GitHub"
fi

echo ""
echo "✅ Deployment Process Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Verify environment variables in Vercel"
echo "   2. Verify Supabase secrets are set"
echo "   3. Test OTP email flow"
echo "   4. Test payment flow"
echo "   5. Run smoke tests"

