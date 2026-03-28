#!/bin/bash
# Update PostgreSQL secret with Session Pooler connection (port 5432)
# Replace YOUR_ACTUAL_PASSWORD with your actual Supabase database password

echo "Updating POSTGRES_SECRET_CMJIQCIFZ0 with Session Pooler connection..."
echo ""
echo "Connection details:"
echo "  Host: aws-1-us-east-2.pooler.supabase.com"
echo "  Port: 5432 (Session Pooler)"
echo "  User: postgres.zdeiezfoemibjgrkyzvs"
echo "  Database: postgres"
echo ""

# Replace YOUR_ACTUAL_PASSWORD with your actual password
goldsky secret update POSTGRES_SECRET_CMJIQCIFZ0 --value '{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "aws-1-us-east-2.pooler.supabase.com",
  "port": 5432,
  "databaseName": "postgres",
  "user": "postgres.zdeiezfoemibjgrkyzvs",
  "password": "YOUR_ACTUAL_PASSWORD"
}'
