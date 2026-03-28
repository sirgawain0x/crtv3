# Mirror Pipeline Deployment Status

## Current Status

**Date**: 2025-01-20  
**Subgraph**: `metokens/1.0.2` - ✅ Finished indexing  
**Pipeline**: `pipeline-metokens-all.yaml` - ✅ Configured and ready

## Completed Steps

### ✅ 1. Pipeline Configuration Updated

**File**: `pipeline-metokens-all.yaml`

**Changes Made**:
- Updated version from `v1.0.2` to `1.0.2` (removed `v` prefix to match subgraph URL format)
- All 4 entities configured: `subscribe`, `mint`, `burn`, `register`
- Resource size: `s` (small - lowest cost)
- PostgreSQL secret: `POSTGRES_SECRET_CMJIQCIFZ0`

**Current Configuration**:
```yaml
sources:
  metoken_subscribes_source:
    name: subscribe
    subgraphs:
      - name: metokens
        version: 1.0.2  # ✅ Updated format
    type: subgraph_entity
  # ... same for mint, burn, register
```

### ✅ 2. Pipeline Validation

**Status**: Config file validation passed
- YAML syntax: ✅ Valid
- Schema: ✅ Valid
- Network connectivity: ⚠️ ENOTFOUND (temporary network issue)

## Pending Steps

### ⏳ 3. Deploy Pipeline

**Command**:
```bash
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

**Note**: Currently failing with `ENOTFOUND` - this appears to be a network connectivity issue with the Goldsky CLI, not a configuration problem.

**When to Retry**:
- Wait a few minutes and try again
- Check internet connectivity
- Verify Goldsky service status
- Try from a different network if possible

### ⏳ 4. Monitor Pipeline

After successful deployment:

```bash
# Check pipeline status
goldsky pipeline monitor pipeline-metokens-all

# Or check dashboard
# https://app.goldsky.com/dashboard/pipelines
```

### ⏳ 5. Verify Data in Supabase

After pipeline is running, verify data:

```sql
-- Check all 4 tables
SELECT 
  'subscribes' as table_name, COUNT(*) as count FROM public.metoken_subscribes
UNION ALL
SELECT 'mints', COUNT(*) FROM public.metoken_mints
UNION ALL
SELECT 'burns', COUNT(*) FROM public.metoken_burns
UNION ALL
SELECT 'registers', COUNT(*) FROM public.metoken_registers;
```

## Subgraph Information

**Subgraph Details**:
- **Name**: `metokens`
- **Version**: `1.0.2`
- **Deployment ID**: `QmcX4jYwMaiZ9aMECnYkhLJvPZG8YCYqMxrHUTpMSNb8qL`
- **Public Endpoint**: `https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/1.0.2/gn`
- **Status**: ✅ Finished indexing
- **Network**: Base Mainnet
- **Contract**: `0xba5502db2aC2cBff189965e991C07109B14eB3f5`
- **Start Block**: `16584535`

## Pipeline Configuration Summary

**Pipeline**: `pipeline-metokens-all.yaml`

**Entities**:
1. ✅ `subscribe` → `metoken_subscribes` table
2. ✅ `mint` → `metoken_mints` table
3. ✅ `burn` → `metoken_burns` table
4. ✅ `register` → `metoken_registers` table

**Configuration**:
- **Type**: Mirror pipeline (not Turbo - cheaper)
- **Resource Size**: `s` (small - lowest cost)
- **API Version**: `3`
- **Sink**: PostgreSQL (Supabase)
- **Secret**: `POSTGRES_SECRET_CMJIQCIFZ0`

## Troubleshooting Network Issues

### ENOTFOUND Error

**Possible Causes**:
1. Network connectivity issue
2. DNS resolution problem
3. Goldsky service temporarily unavailable
4. Firewall/proxy blocking connection

**Solutions**:
1. Wait a few minutes and retry
2. Check internet connection
3. Try from different network
4. Check Goldsky status page
5. Verify CLI is up to date: `goldsky --version`
6. Try re-authenticating: `goldsky login`

### Alternative: Deploy via Dashboard

If CLI continues to fail, deploy via Goldsky dashboard:

1. Go to: https://app.goldsky.com/dashboard/pipelines
2. Click "New Pipeline" or "Deploy Pipeline"
3. Upload or paste `pipeline-metokens-all.yaml` content
4. Set status to `ACTIVE`
5. Deploy

## Next Actions

1. **Retry Deployment**: Wait a few minutes and retry the `goldsky pipeline apply` command
2. **Or Use Dashboard**: Deploy via Goldsky dashboard if CLI continues to fail
3. **Monitor**: Once deployed, monitor pipeline status
4. **Verify**: Check Supabase tables for data

## Cost Comparison

**Current Setup**:
- **Turbo Pipeline**: `resource_size: m` (medium) - Higher cost, only Subscribe events
- **Mirror Pipeline**: `resource_size: s` (small) - Lower cost, all 4 entities ✅

**Recommendation**: Once Mirror pipeline is deployed, consider pausing/removing Turbo pipeline to save costs (unless you want redundancy).

## Summary

- ✅ Pipeline configuration updated and validated
- ✅ Version format corrected (`1.0.2` without `v`)
- ⏳ Deployment pending (network connectivity issue)
- 📋 Ready to deploy once connectivity is restored

---

**Last Updated**: 2025-01-20  
**Status**: Configuration complete, deployment pending due to network issue  
**Action**: Retry deployment when network connectivity is restored
