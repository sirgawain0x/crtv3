# Turbo Pipeline Supabase Pool Error

## Error

```
MaxClientsInSessionMode: max clients reached - in Session mode max clients are limited to pool_size
```

**Pipeline**: `pipeline-metokens-subscribes-turbo`  
**Date**: 2025-01-22  
**Status**: ⚠️ Pool exhaustion - pipeline must be paused

## Root Cause

Even with the Mirror pipeline paused, the Supabase session pool is still at capacity. The Turbo pipeline is trying to create/write to the `metoken_subscribes` table but cannot acquire a connection because the pool is full.

**Supabase Session Pool Limits**:
- Free tier: ~15 connections
- Pro tier: ~25 connections
- Your pool is currently at maximum capacity

## Solution

**Pause the Turbo pipeline** to free up the connection:

```bash
goldsky pipeline pause pipeline-metokens-subscribes-turbo
```

**Or via Dashboard**:
1. Go to: https://app.goldsky.com/dashboard/pipelines
2. Find `pipeline-metokens-subscribes-turbo`
3. Click "Pause"

## Impact

### ✅ Benefits
- Frees 1 Supabase connection
- Resolves "max clients reached" error
- Allows other services (app, Reality.eth, etc.) to use the pool

### ⚠️ Trade-off
- The `metoken_subscribes` table won't receive new data from the Turbo pipeline
- This table is only used as a **fallback** when the subgraph has indexing errors
- Since the subgraph (`metokens/1.0.2`) is stable and working, this is acceptable

## Why This Is Safe

1. **Subgraph is primary source**: The app uses the subgraph directly via `/api/metokens-subgraph`
2. **Fallback only**: `metoken_subscribes` is only queried when subgraph has `indexing_error`
3. **Subgraph is stable**: The deployed `metokens/1.0.2` subgraph is working correctly
4. **No app dependency**: The app's main data source is the `metokens` table (populated by `/api/metokens/sync`), not pipeline tables

## Verification

After pausing the Turbo pipeline:

1. **Check pipeline status**: Should show "PAUSED" in Goldsky dashboard
2. **Check Supabase pool**: Connection count should decrease by 1
3. **Verify app works**: Market API and MeToken features should continue working (they use subgraph)
4. **No more errors**: Turbo pipeline logs should show no more "max clients reached" errors

## Re-enabling (If Needed)

If you need to re-enable the Turbo pipeline later (e.g., if subgraph has issues):

```bash
goldsky pipeline resume pipeline-metokens-subscribes-turbo
```

**Note**: You may need to free up Supabase connections first (pause other services or upgrade your Supabase plan).

---

**Related**: See [PIPELINE_SUPABASE_FIX.md](PIPELINE_SUPABASE_FIX.md) for the complete fix summary.
