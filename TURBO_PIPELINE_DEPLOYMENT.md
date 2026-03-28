# Turbo Pipeline Production Deployment Guide

## Overview

This guide walks you through deploying the `pipeline-metokens-subscribes-turbo.yaml` pipeline to production. This pipeline reads Subscribe events directly from the Base blockchain, bypassing the failing subgraph.

## Prerequisites

### 1. Verify Goldsky CLI is Installed and Authenticated

```bash
# Check if Turbo CLI is installed
turbo --version

# Verify you're logged in
goldsky project list

# Should show your project: "Creative Organization DAO-alchemy"
```

### 2. Verify PostgreSQL Secret Exists

The pipeline uses `POSTGRES_SECRET_CMJIQCIFZ0`. Verify it exists:

```bash
# List all secrets
goldsky secret list

# If the secret doesn't exist, create it:
goldsky secret create POSTGRES_SECRET_CMJIQCIFZ0
```

When prompted, enter your Supabase PostgreSQL connection string:
```
postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Important**: Use the **pooler connection string** (port 6543) for better connection handling, not the direct connection (port 5432).

### 3. Verify Supabase Table Schema

Ensure the `metoken_subscribes` table exists in your Supabase database. The pipeline will auto-create it, but verify the schema matches:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'metoken_subscribes'
);

-- If table exists, check schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'metoken_subscribes'
ORDER BY ordinal_position;
```

**Expected columns** (pipeline will create these automatically):
- `id` (TEXT, PRIMARY KEY) - Composite: transaction_hash-log_index
- `me_token` (TEXT) - MeToken contract address
- `owner` (TEXT) - Owner address
- `hub_id` (TEXT) - Hub ID
- `assets_deposited` (TEXT) - Assets deposited (uint256 as string)
- `minted` (TEXT) - MeTokens minted
- `asset` (TEXT) - Asset address
- `name` (TEXT) - MeToken name
- `symbol` (TEXT) - MeToken symbol
- `block_timestamp` (TEXT) - ISO timestamp string
- `block_number` (BIGINT) - Block number
- `transaction_hash` (TEXT) - Transaction hash
- `log_index` (BIGINT) - Log index

### 4. Verify Database Permissions

Ensure the database user has necessary permissions:

```sql
-- Grant permissions (if needed)
GRANT USAGE, CREATE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

## Step 1: Validate Pipeline Configuration

Before deploying, validate the pipeline configuration:

```bash
cd /Users/sirgawain/Developer/crtv3

# Validate the pipeline YAML
goldsky turbo validate pipeline-metokens-subscribes-turbo.yaml
```

Expected output:
```
✓ Pipeline configuration is valid
```

If there are errors, fix them before proceeding.

## Step 2: Deploy the Pipeline

Deploy the pipeline to production:

```bash
# Deploy the pipeline
goldsky turbo apply pipeline-metokens-subscribes-turbo.yaml
```

Expected output:
```
✓ Pipeline pipeline-metokens-subscribes-turbo created
```

**Note**: The pipeline will start processing from `earliest` (genesis block), so it will backfill all historical Subscribe events. This may take some time depending on how many events exist.

## Step 3: Monitor Pipeline Status

### Check Pipeline Status

```bash
# List all pipelines
goldsky turbo list

# Get detailed status
goldsky turbo status pipeline-metokens-subscribes-turbo
```

### Monitor Pipeline Logs

```bash
# View live logs
goldsky turbo logs pipeline-metokens-subscribes-turbo
```

### Inspect Live Data

```bash
# Inspect data flowing through the pipeline
goldsky turbo inspect pipeline-metokens-subscribes-turbo

# Inspect specific transform stages
goldsky turbo inspect pipeline-metokens-subscribes-turbo -n subscribe_logs
goldsky turbo inspect pipeline-metokens-subscribes-turbo -n decoded_subscribes
goldsky turbo inspect pipeline-metokens-subscribes-turbo -n clean_subscribes
```

### Monitor via Dashboard

Visit the Goldsky dashboard:
```
https://app.goldsky.com/dashboard/pipelines
```

Find `pipeline-metokens-subscribes-turbo` and click to view:
- Pipeline status
- Processing metrics
- Error logs
- Data flow

## Step 4: Verify Data in Supabase

After the pipeline has been running for a few minutes, verify data is being written:

```sql
-- Check if data is being written
SELECT COUNT(*) as total_events
FROM public.metoken_subscribes;

-- Check recent events
SELECT 
  id,
  me_token,
  owner,
  name,
  symbol,
  block_timestamp,
  transaction_hash
FROM public.metoken_subscribes
ORDER BY block_timestamp DESC
LIMIT 10;

-- Verify data quality
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT me_token) as unique_metokens,
  COUNT(DISTINCT owner) as unique_owners,
  MIN(block_timestamp) as earliest_event,
  MAX(block_timestamp) as latest_event
FROM public.metoken_subscribes;
```

## Step 5: Test the Fallback Mechanism

Test that the application correctly falls back to Supabase when the subgraph fails:

### Option A: Simulate Subgraph Error (Recommended for Testing)

Temporarily modify the subgraph endpoint to return an error, or use browser DevTools to block the subgraph request.

### Option B: Verify Fallback Code Path

Check the browser console when the app tries to fetch MeTokens. You should see:

1. **First attempt**: `🔗 Querying subgraph at: ...`
2. **On indexing_error**: `⚠️ Subgraph indexing error - falling back to Supabase (Turbo pipeline data)`
3. **Fallback**: `📊 Fetching Subscribe events from Supabase (Turbo pipeline)...`
4. **Success**: `✅ Successfully fetched X subscribe events from Supabase`

### Verify in Application

1. Open your application
2. Navigate to a page that fetches MeTokens (e.g., market page, profile page)
3. Check browser console for fallback messages
4. Verify MeTokens are displayed correctly

## Step 6: Production Considerations

### Resource Sizing

The pipeline is currently set to `resource_size: m` (medium). Monitor performance:

- **If processing is slow**: Increase to `resource_size: l` (large)
- **If processing is fast and cost is a concern**: Decrease to `resource_size: s` (small)

To update:
```bash
# Edit pipeline-metokens-subscribes-turbo.yaml
# Change: resource_size: m  to  resource_size: l

# Reapply
goldsky turbo apply pipeline-metokens-subscribes-turbo.yaml
```

### Historical Sync Time

Since the pipeline starts from `earliest`, it will process all historical Subscribe events. This may take:
- **Small number of events (< 1000)**: Minutes
- **Medium (1000-10,000)**: 10-30 minutes
- **Large (> 10,000)**: 30+ minutes

Monitor progress via:
```bash
goldsky turbo logs pipeline-metokens-subscribes-turbo
```

### Monitoring and Alerts

Set up monitoring for:
1. **Pipeline health**: Check Goldsky dashboard regularly
2. **Data freshness**: Verify latest events are being processed
3. **Error rates**: Monitor for decoding failures or database errors

### Cost Considerations

- **Turbo pipeline costs**: Based on resource size and data volume
- **Supabase costs**: Storage and query costs for `metoken_subscribes` table
- **Network costs**: Minimal (reads from Goldsky's datasets)

Monitor costs in:
- Goldsky dashboard: Pipeline usage and costs
- Supabase dashboard: Database storage and query metrics

## Troubleshooting

### Pipeline Fails to Start

**Error**: `Failed to create pipeline`

**Solutions**:
1. Verify secret exists: `goldsky secret list`
2. Test database connection manually
3. Check pipeline YAML syntax: `goldsky turbo validate pipeline-metokens-subscribes-turbo.yaml`
4. Check Goldsky dashboard for detailed error messages

### No Data in Supabase

**Symptoms**: Pipeline is running but no data in table

**Solutions**:
1. Check pipeline logs: `goldsky turbo logs pipeline-metokens-subscribes-turbo`
2. Verify Subscribe events exist on Base (check Basescan)
3. Verify event signature is correct
4. Check database permissions
5. Inspect transform stages: `goldsky turbo inspect pipeline-metokens-subscribes-turbo -n clean_subscribes`

### Decoding Errors

**Symptoms**: Logs show decoding failures

**Solutions**:
1. Verify ABI matches the actual Subscribe event structure
2. Check if event signature is correct
3. Verify Diamond contract address is correct: `0xba5502db2aC2cBff189965e991C07109B14eB3f5`
4. Check if there are multiple Subscribe event variants

### App Fallback Not Working

**Symptoms**: App still fails when subgraph errors

**Solutions**:
1. Verify `getAllMeTokensFromSupabase()` method exists in `lib/sdk/metokens/subgraph.ts`
2. Verify `getSubscribeEvents()` method exists in `lib/sdk/supabase/metokens.ts`
3. Check browser console for error messages
4. Verify Supabase table has data
5. Test Supabase query directly:
   ```typescript
   const { MeTokenSupabaseService } = await import('@/lib/sdk/supabase/metokens');
   const service = new MeTokenSupabaseService();
   const events = await service.getSubscribeEvents({ limit: 10 });
   console.log(events);
   ```

## Rollback Plan

If you need to rollback:

### Option 1: Pause Pipeline

```bash
goldsky turbo pause pipeline-metokens-subscribes-turbo
```

This stops processing but keeps the pipeline configuration.

### Option 2: Delete Pipeline

```bash
goldsky turbo delete pipeline-metokens-subscribes-turbo
```

**Warning**: This deletes the pipeline. Data in Supabase remains, but new events won't be processed.

### Option 3: Revert Code Changes

If the app fallback causes issues, you can temporarily disable it by modifying `lib/sdk/metokens/subgraph.ts` to not call `getAllMeTokensFromSupabase()`.

## Next Steps

After successful deployment:

1. ✅ Monitor pipeline for 24-48 hours
2. ✅ Verify data quality and completeness
3. ✅ Test app fallback mechanism
4. ✅ Consider adding similar pipelines for Mints and Burns events
5. ✅ Set up alerts for pipeline health

## Support

- **Goldsky Documentation**: https://docs.goldsky.com/
- **Turbo Pipelines Guide**: https://docs.goldsky.com/turbo-pipelines
- **Goldsky Support**: support@goldsky.com
- **Pipeline Dashboard**: https://app.goldsky.com/dashboard/pipelines

---

**Last Updated**: 2025-01-XX
**Pipeline**: `pipeline-metokens-subscribes-turbo`
**Status**: Ready for Production Deployment
