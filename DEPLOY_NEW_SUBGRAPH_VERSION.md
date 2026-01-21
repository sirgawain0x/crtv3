# Deploy New Subgraph Version for Mirror Pipeline

## Overview

Since the current subgraph `metokens/v0.0.1` has a block hash mismatch error, we'll deploy a fresh version (e.g., `v0.0.2` or `v1.0.0`) and update the Mirror pipeline to use it.

## Option 1: Delete and Redeploy via Dashboard (Recommended)

Since the IPFS hash isn't accessible via CLI, the easiest approach is to delete the broken subgraph from the dashboard and deploy a fresh one:

1. **Delete broken subgraph** from Goldsky dashboard: `metokens/v0.0.1`
2. **Deploy new subgraph** via dashboard: `metokens/v0.0.2`
   - Use IPFS hash: `QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53`
   - Or contact Goldsky support to deploy it

See `DELETE_AND_REDEPLOY_SUBGRAPH.md` for detailed dashboard instructions.

**Benefits:**
- Clean slate - no corrupted state
- Fresh indexing from start
- No block hash mismatch errors
- Dashboard method is more reliable than CLI for this case

## Option 1b: Deploy from Existing IPFS Hash via CLI (If Dashboard Doesn't Work)

If the dashboard doesn't work, try CLI after deleting the broken subgraph:

```bash
# Deploy new version from existing IPFS hash
goldsky subgraph deploy metokens/v0.0.2 \
  --from-ipfs-hash QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53 \
  --description "Fresh deployment for Mirror pipeline - fixed block hash mismatch"
```

**Note:** This may fail if IPFS hash isn't accessible. In that case, use dashboard method or contact support.

## Option 2: Graft from Existing Subgraph

Graft from the latest block of the existing subgraph to avoid re-indexing from genesis:

```bash
# Deploy new version grafting from existing subgraph
goldsky subgraph deploy metokens/v0.0.2 \
  --from-ipfs-hash QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53 \
  --graft-from metokens/v0.0.1 \
  --description "Grafted from v0.0.1 for Mirror pipeline"
```

**Benefits:**
- Faster deployment (doesn't re-index from genesis)
- Preserves historical data up to the graft point
- Fresh state from graft point forward

## Option 3: Deploy from Local Subgraph Directory

If you have the subgraph source code locally:

```bash
# Navigate to subgraph directory
cd /path/to/metokens-subgraph

# Deploy new version
goldsky subgraph deploy metokens/v0.0.2 \
  --path . \
  --description "Fresh deployment for Mirror pipeline"
```

## Step-by-Step Deployment

### Step 1: Deploy New Subgraph Version

Choose one of the options above. For this guide, we'll use Option 1 (from IPFS hash):

```bash
cd /Users/sirgawain/Developer/crtv3

# Deploy new version
goldsky subgraph deploy metokens/v0.0.2 \
  --from-ipfs-hash QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53 \
  --description "Fresh deployment for Mirror pipeline - v0.0.2"
```

**Expected Output:**
```
✓ Deploying subgraph metokens/v0.0.2...
✓ Subgraph deployed successfully!
GraphQL API: https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn
```

### Step 2: Verify Subgraph Status

Wait for the subgraph to start indexing and verify it's healthy:

```bash
# Check subgraph status
goldsky subgraph list metokens/v0.0.2

# Monitor logs (optional)
goldsky subgraph log metokens/v0.0.2 --filter info
```

**Wait for:**
- Status: `healthy` or `syncing` (not `failed`)
- Blocks indexed: Should start increasing
- No fatal errors in logs

### Step 3: Test Subgraph Endpoint

Test that the new subgraph is working:

```bash
# Test the new subgraph endpoint
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/v0.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ subscribes(first: 1) { id meToken hubId blockTimestamp } }"
  }'
```

**Expected Response:**
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

If you get `{"errors":[{"message":"indexing_error"}]}`, wait a bit longer for indexing to progress.

### Step 4: Update Mirror Pipeline Configuration

Update `pipeline-metokens-all.yaml` to use the new subgraph version:

```yaml
name: pipeline-metokens-all
resource_size: s
apiVersion: 3
sources:
  metoken_subscribes_source:
    name: subscribe
    subgraphs:
      - name: metokens
        version: v0.0.2  # ← Updated version
    type: subgraph_entity
  metoken_mints_source:
    name: mint
    subgraphs:
      - name: metokens
        version: v0.0.2  # ← Updated version
    type: subgraph_entity
  metoken_burns_source:
    name: burn
    subgraphs:
      - name: metokens
        version: v0.0.2  # ← Updated version
    type: subgraph_entity
  metoken_registers_source:
    name: register
    subgraphs:
      - name: metokens
        version: v0.0.2  # ← Updated version
    type: subgraph_entity
transforms: {}
sinks:
  postgres_metoken_subscribes:
    from: metoken_subscribes_source
    schema: public
    secret_name: POSTGRES_SECRET_CMJIQCIFZ0
    table: metoken_subscribes
    type: postgres
  postgres_metoken_mints:
    from: metoken_mints_source
    schema: public
    secret_name: POSTGRES_SECRET_CMJIQCIFZ0
    table: metoken_mints
    type: postgres
  postgres_metoken_burns:
    from: metoken_burns_source
    schema: public
    secret_name: POSTGRES_SECRET_CMJIQCIFZ0
    table: metoken_burns
    type: postgres
  postgres_metoken_registers:
    from: metoken_registers_source
    schema: public
    secret_name: POSTGRES_SECRET_CMJIQCIFZ0
    table: metoken_registers
    type: postgres
```

### Step 5: Validate Pipeline Configuration

Validate the updated pipeline:

```bash
goldsky pipeline validate pipeline-metokens-all.yaml
```

**Expected Output:**
```
✓ Successfully validated config file
✓ Validation succeeded
```

### Step 6: Deploy Mirror Pipeline

Deploy the pipeline with the new subgraph version:

```bash
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

**Expected Output:**
```
✓ Pipeline pipeline-metokens-all created
✓ Pipeline is now ACTIVE
```

### Step 7: Monitor Pipeline Status

Monitor the pipeline to ensure it's working:

```bash
# Check pipeline status
goldsky pipeline monitor pipeline-metokens-all

# Or check in dashboard
# https://app.goldsky.com/dashboard/pipelines
```

### Step 8: Verify Data in Supabase

After a few minutes, verify data is being written:

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
```

## Alternative: Use Graft for Faster Deployment

If you want to avoid re-indexing from genesis, use grafting:

```bash
# Deploy with graft from existing subgraph
goldsky subgraph deploy metokens/v0.0.2 \
  --from-ipfs-hash QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53 \
  --graft-from metokens/v0.0.1 \
  --description "Grafted from v0.0.1 - fresh state for Mirror pipeline"
```

**Note:** Grafting requires the source subgraph to be healthy at the graft point. Since v0.0.1 has errors, grafting might not work. In that case, use Option 1 (fresh deployment from IPFS).

## Troubleshooting

### Subgraph Deployment Fails

**Error**: `Failed to deploy subgraph`

**Solutions:**
1. Verify you're logged in: `goldsky login`
2. Check project access: `goldsky project list`
3. Verify IPFS hash is correct
4. Try deploying without graft first

### Pipeline Can't Find New Subgraph Version

**Error**: `Subgraph metokens/v0.0.2 not found`

**Solutions:**
1. Wait a few minutes after deployment
2. Verify subgraph exists: `goldsky subgraph list metokens/v0.0.2`
3. Check the version name matches exactly (case-sensitive)

### No Data in Pipeline

**Symptoms**: Pipeline is running but no data in tables

**Solutions:**
1. Check subgraph is indexing: `goldsky subgraph list metokens/v0.0.2`
2. Verify subgraph has data: Test endpoint with curl
3. Check pipeline logs: `goldsky pipeline monitor pipeline-metokens-all`
4. Verify secret exists: `goldsky secret list`

## Summary

1. ✅ Deploy new subgraph version (v0.0.2) from IPFS hash
2. ✅ Wait for subgraph to start indexing
3. ✅ Test subgraph endpoint
4. ✅ Update `pipeline-metokens-all.yaml` to use v0.0.2
5. ✅ Validate pipeline configuration
6. ✅ Deploy Mirror pipeline
7. ✅ Monitor pipeline status
8. ✅ Verify data in Supabase

## Benefits of New Version

- ✅ Fresh indexing state (no corruption)
- ✅ No block hash mismatch errors
- ✅ Clean slate for Mirror pipeline
- ✅ Can start from specific block if needed
- ✅ Better monitoring and debugging

---

**Last Updated**: 2025-01-20  
**New Subgraph Version**: `v0.0.2` (or `v1.0.0` if preferred)  
**Pipeline**: `pipeline-metokens-all` (updated to use new version)
