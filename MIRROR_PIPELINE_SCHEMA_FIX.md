# Mirror Pipeline Schema Fix

## Issue

The Mirror pipeline was failing with this error:
```
ERROR: column "timestamp" of relation "metoken_registers" does not exist
```

## Root Cause

The subgraph entities output a field called `timestamp`, but the PostgreSQL tables expect `block_timestamp`. Additionally, the subgraph uses camelCase field names (e.g., `meToken`, `hubId`) while the tables use snake_case (e.g., `me_token`, `hub_id`).

## Solution

Added SQL transforms to each entity source to:
1. **Rename `timestamp` to `block_timestamp`** - Fixes the column mismatch error
2. **Convert camelCase to snake_case** - Aligns field names with table schema

## Changes Made

**File**: `pipeline-metokens-all.yaml`

### Before:
```yaml
transforms: {}
sinks:
  postgres_metoken_registers:
    from: metoken_registers_source
```

### After:
```yaml
transforms:
  metoken_registers_transform:
    type: sql
    primary_key: id
    sql: >-
      SELECT 
        vid,
        block,
        id,
        contractId AS contract_id,
        idParam AS id_param,
        owner,
        asset,
        vault,
        refundRatio AS refund_ratio,
        baseY AS base_y,
        reserveWeight AS reserve_weight,
        encodedVaultArgs AS encoded_vault_args,
        blockNumber AS block_number,
        timestamp AS block_timestamp,  # ← Fixed: renamed timestamp
        transactionHash AS transaction_hash,
        _gs_chain,
        _gs_gid
      FROM metoken_registers_source
sinks:
  postgres_metoken_registers:
    from: metoken_registers_transform  # ← Updated to use transform
```

Similar transforms were added for:
- `metoken_subscribes_transform`
- `metoken_mints_transform`
- `metoken_burns_transform`
- `metoken_registers_transform`

## Next Steps

**Update the live pipeline** with the fixed configuration:

```bash
cd /Users/sirgawain/Developer/crtv3
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

Or update via the Goldsky dashboard:
1. Go to: https://app.goldsky.com/dashboard/pipelines
2. Find `pipeline-metokens-all`
3. Edit the configuration
4. Paste the updated YAML content
5. Save and redeploy

## Expected Result

After updating:
- ✅ No more `column "timestamp" does not exist` errors
- ✅ All 4 entities (subscribe, mint, burn, register) syncing correctly
- ✅ Data writing to PostgreSQL tables with correct column names
- ✅ Pipeline logs show successful INSERT operations

## Verification

After redeployment, check the pipeline logs to confirm:
- No errors about missing columns
- Successful INSERT operations
- Data appearing in all 4 tables

You can also verify data in Supabase:
```sql
-- Check all 4 tables have data
SELECT 
  'subscribes' as table_name, COUNT(*) as count FROM public.metoken_subscribes
UNION ALL
SELECT 'mints', COUNT(*) FROM public.metoken_mints
UNION ALL
SELECT 'burns', COUNT(*) FROM public.metoken_burns
UNION ALL
SELECT 'registers', COUNT(*) FROM public.metoken_registers;
```

---

**Date**: 2025-01-20  
**Status**: ✅ Fixed - Ready to redeploy  
**Files Changed**: `pipeline-metokens-all.yaml`
