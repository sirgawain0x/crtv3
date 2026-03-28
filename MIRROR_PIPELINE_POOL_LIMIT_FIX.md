# Mirror Pipeline Connection Pool Limit Fix

## Error
```
MaxClientsInSessionMode: max clients reached - in Session mode max clients are limited to pool_size
```

## Root Cause

The Supabase session pooler (port 6543) has reached its maximum number of concurrent connections. The Mirror pipeline has 4 separate sinks, each potentially creating multiple connections, which can quickly exhaust the pool.

## Supabase Connection Pool Limits

Default pool sizes by plan:
- **Free tier**: ~15 connections
- **Pro tier**: ~25 connections  
- **Team/Enterprise**: Higher limits

## Solutions

### Solution 1: Check for Other Connections (Immediate)

1. **Check Supabase Dashboard**:
   - Go to: https://app.supabase.com/project/zdeiezfoemibjgrkyzvs
   - Navigate to **Database** → **Connection Pooling**
   - Check active connections

2. **Identify other services using the pool**:
   - Your Next.js app
   - Other Goldsky pipelines (Turbo pipeline)
   - Any other services connecting to Supabase

3. **Temporarily reduce connections**:
   - Stop other services temporarily
   - Retry the Mirror pipeline

### Solution 2: Upgrade Supabase Plan (If Needed)

If you're on the free tier and need more connections:
1. Upgrade to Pro tier for more pool connections
2. Or contact Supabase support about increasing pool_size

### Solution 3: Wait and Retry

The pool might free up connections automatically:
1. Wait 1-2 minutes
2. The pipeline should automatically retry
3. Check pipeline logs to see if it recovers

### Solution 4: Optimize Pipeline Configuration

The current pipeline has 4 separate sinks. While this is normal, we can verify they're sharing connections efficiently:

1. **Check if sinks can share connections**:
   - All 4 sinks use the same secret (`POSTGRES_SECRET_CMJIQCIFZ0`)
   - Goldsky should reuse connections, but verify in logs

2. **Monitor connection usage**:
   - Watch Supabase dashboard while pipeline starts
   - See how many connections are created

### Solution 5: Use Transaction Pooler Instead (If Applicable)

If Session Pooler is hitting limits, you could try Transaction Pooler:
- Also uses port 6543
- Different connection handling
- Might have different limits

**Note**: Transaction Pooler doesn't support PREPARE statements, but Mirror pipelines might work fine.

To switch:
1. Get Transaction Pooler connection string from Supabase Dashboard
2. Update the secret:
   ```bash
   goldsky secret update POSTGRES_SECRET_CMJIQCIFZ0 --value '{
     "type": "jdbc",
     "protocol": "postgresql",
     "host": "aws-0-us-west-1.pooler.supabase.com",
     "port": 6543,
     "databaseName": "postgres",
     "user": "postgres.zdeiezfoemibjgrkyzvs",
     "password": "YOUR_PASSWORD"
   }'
   ```

## Immediate Action

1. **Check Supabase Dashboard** for active connections
2. **Wait 1-2 minutes** and let the pipeline retry automatically
3. **Check pipeline logs** to see if it recovers

## Long-term Solution

If this persists:
1. **Upgrade Supabase plan** for more pool connections
2. **Optimize connection usage** across all services
3. **Consider connection pooling** at the application level

## Verification

After applying fixes, verify:
1. Pipeline starts successfully
2. No more "max clients reached" errors
3. Data flows to all 4 tables correctly
