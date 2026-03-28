# Subgraph Deployed - Next Steps

## ✅ Status: Subgraph Deployed and Indexing

The subgraph `metokens/v0.0.2` has been successfully deployed and is now indexing!

## Current Status

- **Subgraph**: `metokens/v0.0.2`
- **Status**: Indexing
- **Contract**: `0xba5502db2aC2cBff189965e991C07109B14eB3f5`
- **Start Block**: `16584535`
- **Network**: Base Mainnet

## Step 1: Monitor Indexing Progress

### Check Subgraph Status

```bash
# Check subgraph status
goldsky subgraph list metokens/v0.0.2
```

**Look for:**
- Status: `syncing` or `healthy` (not `failed`)
- Blocks indexed: Should be increasing
- Synced: Should show progress percentage

### Monitor Logs (Optional)

```bash
# View recent logs
goldsky subgraph log metokens/v0.0.2 --filter info --since 10m
```

## Step 2: Test Subgraph Endpoint

Once indexing has progressed (even partially), test the endpoint:

```bash
# Test the new subgraph endpoint
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ subscribes(first: 1) { id meToken hubId blockTimestamp } }"
  }'
```

### Expected Responses

**If indexing is in progress:**
```json
{
  "errors": [{"message": "indexing_error"}]
}
```
→ This is normal, wait a bit longer for indexing to progress.

**If indexing is complete:**
```json
{
  "data": {
    "subscribes": [
      {
        "id": "...",
        "meToken": "0x...",
        "hubId": "1",
        "blockTimestamp": "..."
      }
    ]
  }
}
```
→ Subgraph is working! ✅

## Step 3: Verify All Entities Are Available

Test that all 4 entities are accessible:

```bash
# Test Subscribe
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ subscribes(first: 1) { id } }"}'

# Test Mint
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ mints(first: 1) { id } }"}'

# Test Burn
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ burns(first: 1) { id } }"}'

# Test Register
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ registers(first: 1) { id } }"}'
```

All should return data (or empty arrays if no events yet), not errors.

## Step 4: Deploy Mirror Pipeline

Once the subgraph is healthy and returning data, deploy the Mirror pipeline:

```bash
# Validate pipeline (already configured for v0.0.2)
goldsky pipeline validate pipeline-metokens-all.yaml

# Deploy the pipeline
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

**Expected Output:**
```
✓ Pipeline pipeline-metokens-all created
✓ Pipeline is now ACTIVE
```

## Step 5: Monitor Pipeline

After deployment, monitor the pipeline:

```bash
# Check pipeline status
goldsky pipeline monitor pipeline-metokens-all

# Or check in dashboard
# https://app.goldsky.com/dashboard/pipelines
```

## Step 6: Verify Data in Supabase

After a few minutes, verify data is being written to PostgreSQL:

```sql
-- Check if data is being written
SELECT COUNT(*) as total_events
FROM public.metoken_subscribes;

-- Check recent events
SELECT 
  id,
  me_token,
  hub_id,
  block_timestamp,
  transaction_hash
FROM public.metoken_subscribes
ORDER BY block_timestamp DESC
LIMIT 10;

-- Verify all 4 tables have data
SELECT 
  'subscribes' as table_name, COUNT(*) as count FROM public.metoken_subscribes
UNION ALL
SELECT 'mints', COUNT(*) FROM public.metoken_mints
UNION ALL
SELECT 'burns', COUNT(*) FROM public.metoken_burns
UNION ALL
SELECT 'registers', COUNT(*) FROM public.metoken_registers;
```

## Timeline Expectations

### Subgraph Indexing
- **Small dataset (< 1000 events)**: 5-15 minutes
- **Medium (1000-10,000)**: 15-30 minutes
- **Large (> 10,000)**: 30+ minutes

Since you're starting from block `16584535` and the current block is around `41120962`, this is a large range. However, if there aren't many events in that range, it should be faster.

### Pipeline Sync
- Once subgraph is ready, pipeline sync is usually very fast (< 5 minutes)
- Pipeline reads from subgraph entities (already indexed)
- Writes to PostgreSQL in real-time

## Troubleshooting

### Subgraph Still Showing "Indexing" After Long Time

**Check:**
1. Look at logs for errors: `goldsky subgraph log metokens/v0.0.2 --filter error`
2. Check if there are many events to index
3. Verify start block is correct (shouldn't be too early)

### Pipeline Can't Find Subgraph

**Error**: `Subgraph metokens/v0.0.2 not found`

**Solution:**
- Wait a few more minutes after deployment
- Verify subgraph exists: `goldsky subgraph list metokens/v0.0.2`
- Check version name matches exactly (case-sensitive)

### No Data in Pipeline

**Symptoms**: Pipeline running but no data in tables

**Solutions:**
1. Verify subgraph has data (test endpoint)
2. Check pipeline logs: `goldsky pipeline monitor pipeline-metokens-all`
3. Verify secret exists: `goldsky secret list`
4. Check database permissions

## Summary

1. ✅ Subgraph deployed successfully
2. ⏳ Currently indexing (monitor progress)
3. 📋 Next: Test endpoint once indexing progresses
4. 📋 Then: Deploy Mirror pipeline
5. 📋 Finally: Verify data in Supabase

## Quick Reference

**Subgraph Endpoint:**
```
https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn
```

**Pipeline Configuration:**
- File: `pipeline-metokens-all.yaml`
- Status: Ready (configured for v0.0.2)
- Entities: subscribe, mint, burn, register
- Resource Size: `s` (small - lowest cost)

**Dashboard:**
- Subgraphs: https://app.goldsky.com/dashboard/subgraphs
- Pipelines: https://app.goldsky.com/dashboard/pipelines

---

**Last Updated**: 2025-01-20  
**Status**: Subgraph deployed and indexing  
**Next Action**: Wait for indexing, then test endpoint and deploy pipeline
