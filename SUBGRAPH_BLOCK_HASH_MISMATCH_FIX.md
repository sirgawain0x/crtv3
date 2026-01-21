# Subgraph Block Hash Mismatch Error - Fix Guide

## Error Details

**Error Type**: Block Hash Mismatch / Indexing Inconsistency

**Specific Error**:
```
Subgraph error does not have same block hash as deployment head
deployment_head: 0xe8013d95d4aeab4d4a8d8ad062ffdc338ca7211924bb1a675a81353c74f0867a
error_block_hash: 0x2a16d42a18b0eee67c07fb2de69a73a099a8119449a659e3f86711d9046b3b76
```

**Additional Context**:
- Subgraph was unassigned from runner
- Status: Failed (Active)
- Fatal error: Failed to transact block operations
- Synced: 100%
- Blocks indexed: 16584535 -> 41120962

## What This Means

This error indicates the subgraph's internal state doesn't match the blockchain state. This typically occurs when:
1. A chain reorganization (reorg) happened that the subgraph couldn't handle
2. The subgraph's indexing state became corrupted
3. There was an interruption during a critical indexing operation

## Fix Steps

### Step 1: Contact Goldsky Support (Recommended)

This type of error usually requires Goldsky's intervention to reset the subgraph to a consistent state.

**Email Template**:

**To**: support@goldsky.com  
**Subject**: Subgraph Block Hash Mismatch Error - metokens/v0.0.1

Hello Goldsky Support Team,

I'm experiencing a block hash mismatch error with my subgraph that requires your assistance.

**Subgraph Details:**
- **Subgraph Name**: `metokens`
- **Version**: `v0.0.1`
- **Deployment ID**: `QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53`
- **Project ID**: `project_cmh0iv6s500dbw2p22vsxcfo6`
- **Network**: Base (Base Mainnet)

**Error Details:**
- Error Type: Block hash mismatch / indexing inconsistency
- Deployment head: `0xe8013d95d4aeab4d4a8d8ad062ffdc338ca7211924bb1a675a81353c74f0867a`
- Error block hash: `0x2a16d42a18b0eee67c07fb2de69a73a099a8119449a659e3f86711d9046b3b76`
- Additional context: Subgraph was unassigned from runner, showing "Failed to transact block operations"

**What I've Tried:**
- Paused and restarted the subgraph via CLI
- Verified subgraph is active in dashboard

**Request:**
Could you please reset the subgraph to a consistent state? The subgraph appears to have encountered a reorg or indexing inconsistency that it couldn't recover from automatically.

Thank you for your assistance.

Best regards,
[Your Name]

### Step 2: Reset via Goldsky Dashboard (If Available)

1. Navigate to: https://app.goldsky.com/dashboard
2. Find subgraph: `metokens/v0.0.1`
3. Look for **"Reset"**, **"Rebuild Index"**, or **"Reset to Block"** option
4. Reset the subgraph to a recent block number (e.g., 41000000) to avoid re-indexing from genesis

### Step 3: Verify Fix

After the subgraph is reset, test it:

```bash
# Test the subgraph endpoint
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.1/gn \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ subscribes(first: 1) { id meToken hubId blockTimestamp } }"
  }'
```

**Expected Response**:
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

If you get data back (not `{"errors":[{"message":"indexing_error"}]}`), the subgraph is working! ✅

## Next Steps After Subgraph is Fixed

Once the subgraph is healthy, deploy the Mirror pipeline:

```bash
# Deploy the Mirror pipeline for all entities
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

The Mirror pipeline is already configured with:
- ✅ `resource_size: s` (small - lowest cost option)
- ✅ All 4 entities: `subscribe`, `mint`, `burn`, `register`
- ✅ Direct write to PostgreSQL tables
- ✅ Automatic table creation

## Current Pipeline Configuration

The `pipeline-metokens-all.yaml` is already optimized for cost:
- **Type**: Mirror pipeline (not Turbo - much cheaper)
- **Resource Size**: `s` (small)
- **Entities**: All 4 entities in one pipeline
- **Sink**: PostgreSQL (Supabase)

This is the most cost-effective approach compared to:
- ❌ Turbo pipelines (more expensive)
- ❌ Multiple separate pipelines (more overhead)
- ❌ Larger resource sizes (unnecessary cost)

## Important Notes

1. **Mirror Pipelines are Cheaper**: Using Mirror pipelines with `resource_size: s` is the most cost-effective way to sync subgraph data to PostgreSQL
2. **Wait for Subgraph Fix**: Don't deploy pipelines until the subgraph is healthy
3. **Data Sync Time**: After reset, the subgraph will need to re-index historical data, which may take time
4. **Monitor Status**: Check subgraph status regularly to catch issues early

## Summary

- ✅ Attempted subgraph restart (paused/started)
- ⚠️ Block hash mismatch error requires Goldsky support intervention
- ✅ Mirror pipeline configuration verified and optimized for cost
- 📋 Next: Contact Goldsky support to reset subgraph
- 🚀 After fix: Deploy Mirror pipeline for all entities

---

**Last Updated**: 2025-01-20  
**Status**: Waiting for Goldsky support to reset subgraph  
**Next Action**: Contact Goldsky support with error details above
