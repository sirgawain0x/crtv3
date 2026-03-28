#!/bin/bash

# Script to create the SUPABASE_CONNECTION secret in Goldsky
# Usage: ./scripts/create-goldsky-secret.sh

set -e

echo "🔐 Creating Goldsky Secret for Supabase Connection"
echo "=================================================="
echo ""

# Check if goldsky CLI is installed
if ! command -v goldsky &> /dev/null; then
    echo "❌ Goldsky CLI is not installed."
    echo "   Install it with: curl https://goldsky.com | sh"
    exit 1
fi

echo "✅ Goldsky CLI found"
echo ""

# Check if user is logged in
if ! goldsky project get &> /dev/null; then
    echo "⚠️  You're not logged in to Goldsky"
    echo "   Please run: goldsky login"
    exit 1
fi

echo "✅ Logged in to Goldsky"
echo ""

# Supabase project details
SUPABASE_PROJECT_REF="zdeiezfoemibjgrkyzvs"
SUPABASE_DB_HOST="db.${SUPABASE_PROJECT_REF}.supabase.co"
SUPABASE_DB_PORT="5432"
SUPABASE_DB_NAME="postgres"
SUPABASE_DB_USER="postgres"

echo "📝 Supabase Connection Details"
echo "----------------------------"
echo "Project: ${SUPABASE_PROJECT_REF}"
echo "Host: ${SUPABASE_DB_HOST}"
echo "Port: ${SUPABASE_DB_PORT}"
echo "Database: ${SUPABASE_DB_NAME}"
echo "User: ${SUPABASE_DB_USER}"
echo ""

echo "To get your database password:"
echo "1. Go to https://app.supabase.com/project/${SUPABASE_PROJECT_REF}"
echo "2. Navigate to Settings → Database"
echo "3. Look for 'Database password' or 'Connection string'"
echo "4. If you need to reset it, click 'Reset database password'"
echo ""

# Prompt for password
read -sp "Enter your Supabase database password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Password cannot be empty"
    exit 1
fi

# URL encode the password (basic encoding for common characters)
# Note: This is a simple encoding. For production, use proper URL encoding.
ENCODED_PASSWORD=$(echo "$DB_PASSWORD" | sed 's/:/%3A/g; s/@/%40/g; s/#/%23/g; s/\$/%24/g; s/&/%26/g; s/+/%2B/g; s/,/%2C/g; s/\//%2F/g; s/?/%3F/g; s/=/%3D/g')

# Construct connection string
CONNECTION_STRING="postgresql://${SUPABASE_DB_USER}:${ENCODED_PASSWORD}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}"

echo ""
echo "🔐 Creating secret in Goldsky..."

# Try to create the secret, or update if it exists
if goldsky secret create SUPABASE_CONNECTION --value "$CONNECTION_STRING" 2>/dev/null; then
    echo "✅ Secret 'SUPABASE_CONNECTION' created successfully!"
elif goldsky secret update SUPABASE_CONNECTION --value "$CONNECTION_STRING" 2>/dev/null; then
    echo "✅ Secret 'SUPABASE_CONNECTION' updated successfully!"
else
    echo "❌ Failed to create/update secret"
    echo ""
    echo "Try creating it manually with:"
    echo "goldsky secret create SUPABASE_CONNECTION --value \"${CONNECTION_STRING}\""
    exit 1
fi

echo ""
echo "✅ Secret created! You can now deploy your pipeline:"
echo "   goldsky pipeline apply pipelines/pipeline-from-metokens.yaml --status ACTIVE"
echo ""

