# Fix "Job Not Found" Error in Mirror Pipeline

## Error
```
Starting pipeline cmkpp1egfy4t101to8dbn0tdp-8...
Pipeline is reporting an error: Job Not Found
```

## What This Means

"Job Not Found" indicates that the pipeline job failed to create or start. This typically happens when:
1. **Source connectivity fails** - Can't connect to the subgraph
2. **Sink connectivity fails** - Can't connect to PostgreSQL
3. **Transform validation fails** - SQL syntax or logic errors
4. **Resource allocation fails** - Insufficient resources or quota issues

## Troubleshooting Steps

### Step 1: Verify Pipeline Validation Passes

```bash
goldsky pipeline validate pipeline-metokens-all.yaml
```

If validation fails, fix the errors before proceeding.

### Step 2: Check Subgraph Availability

Verify the subgraph is accessible:

```bash
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/1.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ subscribes(first: 1) { id } }"}'
```

**Expected**: Should return JSON with data, not an error.

**If it fails**: The subgraph might be down or the version might be wrong.

### Step 3: Verify PostgreSQL Secret

```bash
goldsky secret list
```

Look for `POSTGRES_SECRET_CMJIQCIFZ0` in the list.

**If missing**: Create it using the steps in `GOLDSKY_SECRET_CREATION.md`

**If exists but connection fails**: The secret might have invalid credentials. Check:
- Connection string format
- Password is correct
- Using Session Pooling (port 6543) not direct connection (port 5432)

### Step 4: Check Pipeline Logs in Dashboard

1. Go to: https://app.goldsky.com/dashboard/pipelines
2. Find `pipeline-metokens-all`
3. Check the **Logs** tab for detailed error messages
4. Look for specific errors about:
   - Source connection failures
   - Sink connection failures
   - Transform SQL errors
   - Resource allocation issues

### Step 5: Test Without Transforms (Isolation)

To isolate whether the issue is with transforms, temporarily remove them:

**Temporary test configuration:**
```yaml
transforms: {}
sinks:
  postgres_metoken_subscribes:
    from: metoken_subscribes_source  # Direct from source, no transform
```

If this works, the issue is with the SQL transforms. If it still fails, the issue is with source or sink connectivity.

### Step 6: Check Resource Limits

The pipeline uses `resource_size: s` (small). If you're hitting quota limits:
- Check your Goldsky plan limits
- Try pausing other pipelines
- Contact Goldsky support if needed

## Most Common Causes

### 1. PostgreSQL Secret Issue (Most Likely)

The secret `POSTGRES_SECRET_CMJIQCIFZ0` might be:
- Missing
- Has invalid credentials
- Using wrong connection format (needs Session Pooling for Supabase)

**Fix**: Verify secret exists and has correct Session Pooling connection string.

### 2. Subgraph Not Accessible

The subgraph `metokens/1.0.2` might be:
- Not fully indexed yet
- Temporarily unavailable
- Wrong version number

**Fix**: Verify subgraph is accessible via the GraphQL endpoint.

### 3. SQL Transform Issue

The `SELECT *, `timestamp` AS block_timestamp` might cause issues:
- Column name conflicts
- Flink SQL syntax incompatibility

**Fix**: If other steps don't work, try explicitly listing fields instead of using `SELECT *`.

## Quick Fix: Redeploy Pipeline

Sometimes a simple redeploy fixes transient issues:

```bash
# Pause the pipeline first (if it exists)
goldsky pipeline pause pipeline-metokens-all

# Then redeploy
goldsky pipeline apply pipeline-metokens-all.yaml --status ACTIVE
```

## Next Steps

1. **Check dashboard logs** - Most detailed error info will be there
2. **Verify secret exists** - `goldsky secret list`
3. **Test subgraph endpoint** - Verify it's accessible
4. **Try without transforms** - Isolate the issue
5. **Contact Goldsky support** - If all else fails, they can check backend logs

## Expected Resolution

Once the underlying issue (secret, subgraph, or transform) is fixed:
- Pipeline job should create successfully
- Status should show "RUNNING" or "ACTIVE"
- Data should start flowing to PostgreSQL tables
