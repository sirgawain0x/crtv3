#!/bin/bash
# Update PostgreSQL secret with Session Pooler connection
# Replace YOUR_ACTUAL_PASSWORD with your actual Supabase database password

goldsky secret update POSTGRES_SECRET_CMJIQCIFZ0 --value '{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "aws-1-us-east-2.pooler.supabase.com",
  "port": 5432,
  "databaseName": "postgres",
  "user": "postgres.zdeiezfoemibjgrkyzvs",
  "password": "YOUR_ACTUAL_PASSWORD"
}'
