# Delete and Redeploy Subgraph - Dashboard Method

## Overview

Since the IPFS hash isn't accessible via CLI and the subgraph has errors, the easiest approach is to delete the broken subgraph from the Goldsky dashboard and deploy a fresh one.

## Step 1: Delete Broken Subgraph

1. **Go to Goldsky Dashboard:**
   - Navigate to: https://app.goldsky.com/dashboard
   - Login to your account

2. **Find the Subgraph:**
   - Go to the "Subgraphs" section
   - Find `metokens/v0.0.1` (the one with the block hash mismatch error)

3. **Delete the Subgraph:**
   - Click on the subgraph to open its details
   - Look for a **"Delete"** or **"Remove"** button (usually in settings or actions menu)
   - Confirm the deletion

**Note:** This will remove the broken subgraph. Historical data will be lost, but since it's broken anyway, this is fine.

## Step 2: Deploy New Subgraph via Dashboard

### Option A: Deploy as v0.0.1 (Same Version)

If you want to keep the same version name:

1. **In Goldsky Dashboard:**
   - Go to "Subgraphs" section
   - Click "New Subgraph" or "Deploy Subgraph"

2. **Configure Deployment:**
   - **Name**: `metokens`
   - **Version**: `v0.0.1`
   - **Network**: `base` (Base Mainnet)
   - **Source**: You'll need to provide:
     - IPFS hash: `QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53`
     - OR upload subgraph files if you have them locally
     - OR use the deployment wizard if available

3. **Deploy:**
   - Click "Deploy" or "Create"
   - Wait for deployment to start

### Option B: Deploy as v0.0.2 (New Version) - Recommended

Since the pipeline is already configured for `v0.0.2`, this is the recommended approach:

1. **In Goldsky Dashboard:**
   - Go to "Subgraphs" section
   - Click "New Subgraph" or "Deploy Subgraph"

2. **Configure Deployment:**
   - **Name**: `metokens`
   - **Version**: `v0.0.2`
   - **Network**: `base` (Base Mainnet)
   - **Source**: Provide IPFS hash or upload files

3. **Deploy:**
   - Click "Deploy" or "Create"
   - Wait for deployment to start

## Step 3: Verify New Subgraph

After deployment, verify the subgraph is working:

```bash
# Check subgraph status
goldsky subgraph list metokens/v0.0.2

# Test the endpoint
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
    "subscribes": [...]
  }
}
```

If you get `{"errors":[{"message":"indexing_error"}]}`, wait a bit for indexing to start.

## Step 4: Deploy Mirror Pipeline

Once the subgraph is healthy and indexing, deploy the Mirror pipeline:

```bash
# Validate pipeline (already configured for v0.0.2)
goldsky pipeline validate pipeline-metokens-all.yaml

# Deploy the pipeline
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

## Alternative: If Dashboard Doesn't Have Deploy Option

If the dashboard doesn't allow deploying from IPFS hash, you have two options:

### Option 1: Contact Goldsky Support

Ask them to:
1. Delete the broken `metokens/v0.0.1` subgraph
2. Deploy a fresh `metokens/v0.0.2` from IPFS hash `QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53`

**Email Template:**

```
Subject: Request to Delete and Redeploy MeTokens Subgraph

Hello Goldsky Support,

I need assistance with my MeTokens subgraph:

1. Delete the broken subgraph: metokens/v0.0.1
   - Deployment ID: QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53
   - It has a block hash mismatch error and is not functioning

2. Deploy a fresh subgraph: metokens/v0.0.2
   - From the same IPFS hash: QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53
   - Network: Base Mainnet
   - Project: project_cmh0iv6s500dbw2p22vsxcfo6

This is needed to fix the indexing errors and enable our Mirror pipeline.

Thank you!
```

### Option 2: Use CLI After Dashboard Deletion

1. Delete via dashboard (as described in Step 1)
2. Try CLI deployment again (might work after deletion):
   ```bash
   goldsky subgraph deploy metokens/v0.0.2 \
     --from-ipfs-hash QmVaWYhk4HKhk9rNQi11RKujTVS4KHF1uHGNVUF4f7xJ53 \
     --description "Fresh deployment for Mirror pipeline"
   ```

## Current Pipeline Configuration

The `pipeline-metokens-all.yaml` is already configured for `v0.0.2`:

```yaml
sources:
  metoken_subscribes_source:
    name: subscribe
    subgraphs:
      - name: metokens
        version: v0.0.2  # ← Ready for new deployment
```

If you deploy as `v0.0.1` instead, you'll need to update the pipeline back to `v0.0.1`.

## Summary

1. ✅ Delete broken `metokens/v0.0.1` from dashboard
2. ✅ Deploy fresh `metokens/v0.0.2` from dashboard (or contact support)
3. ✅ Wait for subgraph to start indexing
4. ✅ Verify subgraph is working
5. ✅ Deploy Mirror pipeline (already configured for v0.0.2)

## Benefits

- ✅ Clean slate - no corrupted state
- ✅ Fresh indexing from start
- ✅ No block hash mismatch errors
- ✅ Pipeline already configured and ready

---

**Last Updated**: 2025-01-20  
**Method**: Dashboard deletion + redeployment  
**New Version**: `v0.0.2` (recommended) or `v0.0.1` (if preferred)
