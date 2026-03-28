#!/bin/bash

# Script to create the SUPABASE_CONNECTION secret in Goldsky
# Using the correct JSON format as per Goldsky documentation
# For Supabase, we MUST use Session Pooling connection string

set -e

echo "🔐 Creating Goldsky Secret for Supabase (Correct Format)"
echo "========================================================"
echo ""

# Check if goldsky CLI is installed
if ! command -v goldsky &> /dev/null; then
    echo "❌ Goldsky CLI is not installed."
    exit 1
fi

echo "✅ Goldsky CLI found"
echo ""

# Supabase project details
SUPABASE_PROJECT_REF="zdeiezfoemibjgrkyzvs"

echo "📝 Supabase Connection Setup"
echo "----------------------------"
echo ""
echo "⚠️  IMPORTANT: Supabase direct connections don't work with Goldsky!"
echo "   You MUST use Session Pooling connection string."
echo ""
echo "To get your Session Pooling connection string:"
echo "1. Go to https://app.supabase.com/project/${SUPABASE_PROJECT_REF}"
echo "2. Navigate to Settings → Database"
echo "3. Scroll down to 'Connection pooling' section"
echo "4. Copy the 'Session mode' connection string"
echo "   (It will look like: postgresql://postgres.xxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres)"
echo ""

read -p "Enter Session Pooling host (e.g., aws-0-us-west-1.pooler.supabase.com): " POOLER_HOST
read -p "Enter Session Pooling port (usually 6543): " POOLER_PORT
read -sp "Enter your Supabase database password: " DB_PASSWORD
echo ""

if [ -z "$POOLER_HOST" ] || [ -z "$POOLER_PORT" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ All fields are required"
    exit 1
fi

# Construct the JSON secret value
SECRET_JSON=$(cat <<EOF
{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "${POOLER_HOST}",
  "port": ${POOLER_PORT},
  "databaseName": "postgres",
  "user": "postgres.${SUPABASE_PROJECT_REF}",
  "password": "${DB_PASSWORD}"
}
EOF
)

echo ""
echo "🔐 Creating secret in Goldsky..."
echo "Secret name: SUPABASE_CONNECTION"
echo ""

# Create the secret using the JSON format
if goldsky secret create --name SUPABASE_CONNECTION --value "$SECRET_JSON" 2>/dev/null; then
    echo "✅ Secret 'SUPABASE_CONNECTION' created successfully!"
elif goldsky secret update SUPABASE_CONNECTION --value "$SECRET_JSON" 2>/dev/null; then
    echo "✅ Secret 'SUPABASE_CONNECTION' updated successfully!"
else
    echo "❌ Failed to create/update secret"
    echo ""
    echo "Try creating it manually with:"
    echo ""
    echo 'goldsky secret create --name SUPABASE_CONNECTION --value '"'"'{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "'"${POOLER_HOST}"'",
  "port": '"${POOLER_PORT}"',
  "databaseName": "postgres",
  "user": "postgres.'"${SUPABASE_PROJECT_REF}"'",
  "password": "'"${DB_PASSWORD}"'"
}'"'"'"
    exit 1
fi

echo ""
echo "✅ Secret created! You can now deploy your pipeline:"
echo "   goldsky pipeline apply pipelines/pipeline-from-metokens.yaml --status ACTIVE"
echo ""

