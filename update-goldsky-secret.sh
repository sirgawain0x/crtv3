#!/bin/bash
# Update Goldsky secret with verified Supabase Session Pooler connection
# Connection verified: PostgreSQL 17.6 responding ✅

echo "🔐 Updating Goldsky Secret: POSTGRES_SECRET_CMJIQCIFZ0"
echo "=================================================="
echo ""
echo "Connection details (verified):"
echo "  Host: aws-1-us-east-2.pooler.supabase.com"
echo "  Port: 5432 (Session Pooler)"
echo "  User: postgres.zdeiezfoemibjgrkyzvs"
echo "  Database: postgres"
echo "  PostgreSQL: 17.6 ✅"
echo ""

# Check if password is provided
if [ -z "$1" ]; then
  echo "❌ Error: Database password required"
  echo ""
  echo "Usage:"
  echo "  ./update-goldsky-secret.sh YOUR_DATABASE_PASSWORD"
  echo ""
  echo "Or set it as environment variable:"
  echo "  export SUPABASE_DB_PASSWORD='your-password'"
  echo "  ./update-goldsky-secret.sh"
  echo ""
  exit 1
fi

PASSWORD="${1:-$SUPABASE_DB_PASSWORD}"

echo "Updating secret..."
goldsky secret update POSTGRES_SECRET_CMJIQCIFZ0 --value "{
  \"type\": \"jdbc\",
  \"protocol\": \"postgresql\",
  \"host\": \"aws-1-us-east-2.pooler.supabase.com\",
  \"port\": 5432,
  \"databaseName\": \"postgres\",
  \"user\": \"postgres.zdeiezfoemibjgrkyzvs\",
  \"password\": \"${PASSWORD}\"
}"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Secret updated successfully!"
  echo ""
  echo "Next steps:"
  echo "  1. Verify the secret: goldsky secret list"
  echo "  2. Restart the Turbo pipeline: goldsky turbo apply pipeline-metokens-subscribes-turbo.yaml"
  echo "  3. Check pipeline status: goldsky turbo list"
else
  echo ""
  echo "❌ Failed to update secret. Please check:"
  echo "  1. Password is correct"
  echo "  2. You're authenticated with Goldsky: goldsky project list"
  echo "  3. Secret name is correct: POSTGRES_SECRET_CMJIQCIFZ0"
fi
