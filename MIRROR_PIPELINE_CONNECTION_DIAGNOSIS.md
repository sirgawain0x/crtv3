# Mirror Pipeline Connection Error Diagnosis

## Current Status

- ✅ Secret exists: `POSTGRES_SECRET_CMJIQCIFZ0`
- ✅ Pipeline validation passes
- ✅ Pipeline job is being created (no longer "Job Not Found")
- ❌ Connection error when trying to connect to source or sink

## Diagnosis Steps

### Step 1: Test Subgraph Source

Test if the subgraph is accessible:

```bash
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/1.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ subscribes(first: 1) { id } }"}'
```

**Expected**: Should return JSON with data
**If it fails**: Subgraph source is not accessible

### Step 2: Check Dashboard Logs

The dashboard logs will show which component is failing:

1. Go to: https://app.goldsky.com/dashboard/pipelines
2. Find `pipeline-metokens-all`
3. Check the **Logs** tab
4. Look for specific errors about:
   - "Failed to connect to subgraph" → Source issue
   - "Failed to connect to PostgreSQL" → Sink issue
   - "SQL transform error" → Transform issue

### Step 3: Test Secret Connection

Even though the secret exists, the credentials might be invalid:

```bash
# Check if you can get secret details (if supported)
goldsky secret get POSTGRES_SECRET_CMJIQCIFZ0
```

Or verify the secret was created with Session Pooling (required for Supabase):
- Should use port `6543` (Session Pooling)
- NOT port `5432` (direct connection - doesn't work with Goldsky)

### Step 4: Isolate the Issue

Test without transforms to see if the issue is with the SQL transforms:

**Temporary test - remove transforms:**
```yaml
transforms: {}
sinks:
  postgres_metoken_subscribes:
    from: metoken_subscribes_source  # Direct from source
```

If this works, the issue is with the SQL transforms. If it still fails, the issue is with source or sink connectivity.

## Most Likely Causes

### 1. Subgraph Source Not Accessible (Most Likely)

The subgraph `metokens/1.0.2` might be:
- Not fully indexed
- Temporarily unavailable
- Network connectivity issues

**Fix**: Verify subgraph endpoint is accessible (Step 1 above)

### 2. PostgreSQL Secret Has Wrong Credentials

Even though the secret exists, it might have:
- Wrong password
- Wrong connection format (needs Session Pooling)
- Expired credentials

**Fix**: Verify secret uses Session Pooling connection string (port 6543)

### 3. SQL Transform Creating Duplicate Columns

The `SELECT *, `timestamp` AS block_timestamp` creates both:
- `timestamp` (original column)
- `block_timestamp` (renamed column)

The PostgreSQL sink might fail when trying to write `timestamp` to a table that doesn't have that column.

**Fix**: If this is the issue, we need to explicitly list fields excluding `timestamp`

## Quick Fix: Test Without Transforms

To quickly isolate if it's a transform issue, temporarily modify the pipeline:

```yaml
transforms: {}
sinks:
  postgres_metoken_subscribes:
    from: metoken_subscribes_source
    # ... rest of config
```

If this works, the issue is with the SQL transforms. Then we can fix the transform to properly exclude the `timestamp` column.

## Next Actions

1. **Check dashboard logs** - Will show exact error
2. **Test subgraph endpoint** - Verify source is accessible
3. **Try without transforms** - Isolate the issue
4. **Fix transform if needed** - If transforms are the issue, we'll need to explicitly list fields
