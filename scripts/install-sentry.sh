#!/bin/bash

# ==============================================================================
# Sentry Installation Script
# ==============================================================================
# Installs and configures Sentry for Next.js
#
# Usage:
#   chmod +x scripts/install-sentry.sh
#   ./scripts/install-sentry.sh
# ==============================================================================

set -e  # Exit on error

echo "🔍 Sentry Installation Script"
echo "=============================="
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

# Install Sentry package
echo "📦 Installing @sentry/nextjs..."
npm install --save @sentry/nextjs

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Sentry package installed successfully"
else
    echo "❌ Failed to install Sentry package"
    exit 1
fi

echo ""
echo "📝 Configuration files already in place:"
echo "  ✅ sentry.client.config.ts"
echo "  ✅ sentry.server.config.ts"
echo "  ✅ sentry.edge.config.ts"
echo "  ✅ instrumentation.ts"
echo ""

# Prompt for Sentry DSN
echo "🔐 Sentry Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To complete setup, you need a Sentry DSN."
echo ""
echo "Steps:"
echo "1. Go to https://sentry.io"
echo "2. Create a new project (select 'Next.js')"
echo "3. Copy the DSN from project settings"
echo ""
read -p "Do you have a Sentry DSN? (y/n): " has_dsn

if [ "$has_dsn" = "y" ] || [ "$has_dsn" = "Y" ]; then
    read -p "Enter your Sentry DSN: " sentry_dsn

    # Add to .env.local if it exists, otherwise create it
    if [ -f .env.local ]; then
        # Check if DSN already exists
        if grep -q "NEXT_PUBLIC_SENTRY_DSN" .env.local; then
            # Update existing DSN
            sed -i '' "s|NEXT_PUBLIC_SENTRY_DSN=.*|NEXT_PUBLIC_SENTRY_DSN=$sentry_dsn|" .env.local
            echo "✅ Updated NEXT_PUBLIC_SENTRY_DSN in .env.local"
        else
            # Append new DSN
            echo "" >> .env.local
            echo "# Sentry Error Reporting" >> .env.local
            echo "NEXT_PUBLIC_SENTRY_DSN=$sentry_dsn" >> .env.local
            echo "✅ Added NEXT_PUBLIC_SENTRY_DSN to .env.local"
        fi
    else
        # Create new .env.local
        echo "# Sentry Error Reporting" > .env.local
        echo "NEXT_PUBLIC_SENTRY_DSN=$sentry_dsn" >> .env.local
        echo "✅ Created .env.local with NEXT_PUBLIC_SENTRY_DSN"
    fi
else
    echo ""
    echo "⚠️  Skipping DSN configuration"
    echo "   You can add it later to .env.local:"
    echo "   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/..."
fi

echo ""
echo "✅ Sentry installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add NEXT_PUBLIC_SENTRY_DSN to .env.local (if not done)"
echo "2. Test error reporting:"
echo "   - Run: npm run dev"
echo "   - Visit: http://localhost:3000/test-sentry"
echo "   - Check Sentry dashboard for errors"
echo ""
echo "3. For production:"
echo "   - Add NEXT_PUBLIC_SENTRY_DSN to .env.production"
echo "   - Build: npm run build"
echo "   - Deploy following docs/DEPLOYMENT.md"
echo ""
echo "📖 Full documentation: DOCKER_SENTRY_SETUP.md"
echo ""
