# Subgraph Entities Analysis - What's Needed for Mirror Pipeline

## Required Entities (4)

Based on `pipeline-metokens-all.yaml` and application usage, only these 4 entities are **necessary**:

### ✅ 1. `subscribe` (3 records)
- **Purpose**: MeToken creation events
- **Used by**: 
  - Mirror pipeline → `metoken_subscribes` table
  - Application queries for all MeTokens
- **Status**: **REQUIRED**

### ✅ 2. `mint` (30 records)
- **Purpose**: Minting events (users buying MeTokens)
- **Used by**:
  - Mirror pipeline → `metoken_mints` table
  - Application queries for recent mints
- **Status**: **REQUIRED**

### ✅ 3. `burn` (9 records)
- **Purpose**: Burning events (users selling MeTokens)
- **Used by**:
  - Mirror pipeline → `metoken_burns` table
  - Application queries for recent burns
- **Status**: **REQUIRED**

### ✅ 4. `register` (1 record)
- **Purpose**: Hub registration events
- **Used by**:
  - Mirror pipeline → `metoken_registers` table
  - Application queries for hub information
- **Status**: **REQUIRED**

## Potentially Useful Entities (2)

These have data but are **not** in the current Mirror pipeline:

### ⚠️ `update_balance_pooled` (39 records)
- **Purpose**: Tracks changes to pooled balance
- **Status**: Not in pipeline, but might be useful for analytics
- **Decision**: Optional - can add later if needed

### ⚠️ `update_balance_locked` (9 records)
- **Purpose**: Tracks changes to locked balance
- **Status**: Not in pipeline, but might be useful for analytics
- **Decision**: Optional - can add later if needed

## Not Needed (18 entities with 0 records)

All of these have **0 records**, so they're not necessary:

- ❌ `cancel_resubscribe` (0 records)
- ❌ `cancel_transfer_me_token_ownership` (0 records)
- ❌ `cancel_update` (0 records)
- ❌ `claim_me_token_ownership` (0 records)
- ❌ `deactivate` (0 records)
- ❌ `donate` (0 records)
- ❌ `finish_resubscribe` (0 records)
- ❌ `finish_update` (0 records)
- ❌ `init_resubscribe` (0 records)
- ❌ `init_update` (0 records)
- ❌ `set_burn_buyer_fee` (0 records)
- ❌ `set_burn_owner_fee` (0 records)
- ❌ `set_mint_fee` (0 records)
- ❌ `transfer_hub_ownership` (0 records)
- ❌ `transfer_me_token_ownership` (0 records)
- ❌ `update_balances` (0 records)
- ❌ `dropped_indexes_*` (internal/system tables - can ignore)

## Recommendation

### For Mirror Pipeline: Only 4 Entities Needed

When deploying the new subgraph with `--from-abi`, the auto-generated subgraph will include handlers for all events in the ABI. However, for the Mirror pipeline, you only need:

1. ✅ **subscribe** - MeToken creation
2. ✅ **mint** - Minting events
3. ✅ **burn** - Burning events
4. ✅ **register** - Hub registration

### ABI File

The `metoken-abi.json` file I created includes only these 4 events, which is perfect for your use case. This will:
- ✅ Generate a simpler subgraph
- ✅ Faster indexing (fewer entities to process)
- ✅ Lower cost (less data to index)
- ✅ Matches your Mirror pipeline exactly

### Optional: Add Balance Updates Later

If you need `update_balance_pooled` and `update_balance_locked` in the future, you can:
1. Add them to the ABI file
2. Redeploy the subgraph
3. Add them to the Mirror pipeline

But for now, the 4 core entities are sufficient.

## Summary

**Minimum Required**: 4 entities (subscribe, mint, burn, register)  
**Current ABI**: ✅ Already configured with only these 4  
**Mirror Pipeline**: ✅ Already configured for these 4  
**Action**: Deploy with the current `metoken-abi.json` - it's perfect!

---

**Last Updated**: 2025-01-20  
**Entities in Pipeline**: 4 (subscribe, mint, burn, register)  
**Entities with Data**: 6 (4 required + 2 optional)  
**Entities with 0 Records**: 18 (not needed)
