#!/bin/bash
# Update Goldsky secret using Vercel environment variables
# This script uses the Supabase integration variables from Vercel

echo "🔐 Updating Goldsky Secret from Vercel Environment Variables"
echo "=============================================================="
echo ""

# Check if we have the required variables
if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "❌ Error: POSTGRES_PASSWORD environment variable not found"
  echo ""
  echo "To use this script, export your Vercel environment variables:"
  echo "  export POSTGRES_PASSWORD='your-password'"
  echo "  export POSTGRES_HOST='aws-1-us-east-2.pooler.supabase.com'"
  echo "  export POSTGRES_USER='postgres.zdeiezfoemibjgrkyzvs'"
  echo "  export POSTGRES_DATABASE='postgres'"
  echo ""
  echo "Or get them from Vercel:"
  echo "  vercel env pull .env.local"
  echo "  source .env.local"
  echo ""
  exit 1
fi

# Use provided values or defaults
HOST="${POSTGRES_HOST:-aws-1-us-east-2.pooler.supabase.com}"
PORT="${POSTGRES_PORT:-5432}"
USER="${POSTGRES_USER:-postgres.zdeiezfoemibjgrkyzvs}"
DATABASE="${POSTGRES_DATABASE:-postgres}"
PASSWORD="$POSTGRES_PASSWORD"

# Try to parse from POSTGRES_URL if it exists
if [ -n "$POSTGRES_URL" ]; then
  echo "📋 Found POSTGRES_URL, attempting to parse..."
  # Extract components from postgresql://user:pass@host:port/db format
  if [[ $POSTGRES_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    PARSED_USER="${BASH_REMATCH[1]}"
    PARSED_PASSWORD="${BASH_REMATCH[2]}"
    PARSED_HOST="${BASH_REMATCH[3]}"
    PARSED_PORT="${BASH_REMATCH[4]}"
    PARSED_DB="${BASH_REMATCH[5]}"
    
    # Use parsed values if they exist
    [ -n "$PARSED_PASSWORD" ] && PASSWORD="$PARSED_PASSWORD"
    [ -n "$PARSED_HOST" ] && HOST="$PARSED_HOST"
    [ -n "$PARSED_PORT" ] && PORT="$PARSED_PORT"
    [ -n "$PARSED_USER" ] && USER="$PARSED_USER"
    [ -n "$PARSED_DB" ] && DATABASE="$PARSED_DB"
    
    echo "✅ Parsed connection details from POSTGRES_URL"
  fi
fi

echo "Connection details:"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  User: $USER"
echo "  Database: $DATABASE"
echo "  Password: [HIDDEN]"
echo ""

# Confirm before updating
read -p "Update Goldsky secret with these details? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 1
fi

echo ""
echo "Updating secret POSTGRES_SECRET_CMJIQCIFZ0..."

goldsky secret update POSTGRES_SECRET_CMJIQCIFZ0 --value "{
  \"type\": \"jdbc\",
  \"protocol\": \"postgresql\",
  \"host\": \"${HOST}\",
  \"port\": ${PORT},
  \"databaseName\": \"${DATABASE}\",
  \"user\": \"${USER}\",
  \"password\": \"${PASSWORD}\"
}"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Secret updated successfully!"
  echo ""
  echo "Next steps:"
  echo "  1. Verify: goldsky secret list"
  echo "  2. Restart pipeline: goldsky turbo apply pipeline-metokens-subscribes-turbo.yaml"
  echo "  3. Check status: goldsky turbo list"
else
  echo ""
  echo "❌ Failed to update secret"
  exit 1
fi
