# Verify Secret Uses Session Pooling

## Current Status

- ✅ Turbo pipeline works → Secret is configured correctly
- ❌ Mirror pipeline connection error → Likely NOT a secret issue

## Supabase Connection Types

### Port 5432 - Direct Connection
- **Does NOT work** with external services like Goldsky
- Only supports IPv6
- Will fail with connection errors

### Port 6543 - Session Pooling (Required)
- **Works** with external services like Goldsky
- Supports IPv4
- This is what you need

## Verify Your Secret

Since Turbo pipeline works, your secret `POSTGRES_SECRET_CMJIQCIFZ0` is likely correctly configured with:
- Port: `6543` (Session Pooling)
- Host: `aws-1-us-east-2.pooler.supabase.com` (or similar pooler host)
- User: `postgres.zdeiezfoemibjgrkyzvs`

## If Secret Needs Update

If you need to verify or update the secret to use Session Pooling (port 6543):

1. **Get Session Pooling connection string from Supabase:**
   - Go to: https://app.supabase.com/project/zdeiezfoemibjgrkyzvs
   - Settings → Database
   - Scroll to **Connection pooling** section
   - Copy **Session mode** connection string
   - Should show port `6543`

2. **Update the secret:**
   ```bash
   goldsky secret update POSTGRES_SECRET_CMJIQCIFZ0 --value '{
     "type": "jdbc",
     "protocol": "postgresql",
     "host": "aws-1-us-east-2.pooler.supabase.com",
     "port": 6543,
     "databaseName": "postgres",
     "user": "postgres.zdeiezfoemibjgrkyzvs",
     "password": "YOUR_PASSWORD"
   }'
   ```

## Why Mirror Pipeline Might Still Fail

Since Turbo works, the secret is fine. The Mirror pipeline connection error is likely due to:

1. **Subgraph source connectivity** - Mirror pipelines connect to subgraphs differently than Turbo
2. **SQL transform issue** - The `SELECT *, `timestamp` AS block_timestamp` might be causing problems

## Next Steps

1. **Verify secret uses port 6543** (if unsure, check Supabase dashboard)
2. **Check Mirror pipeline logs** - Will show if it's source or sink issue
3. **If source issue** - Mirror pipelines might need private subgraph endpoints
4. **If transform issue** - We may need to fix the SQL to avoid duplicate columns
