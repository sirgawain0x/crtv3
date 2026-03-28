# Mirror Pipeline Connection Error Troubleshooting

## Error
```
Pipeline is reporting an error: Encountered connection error, please check source and sink availability, credentials, and connectivity
```

## Possible Causes

### 1. PostgreSQL Secret Issue
The secret `POSTGRES_SECRET_CMJIQCIFZ0` might be:
- Missing
- Invalid/expired credentials
- Wrong connection string format
- Network restrictions blocking Goldsky IPs

### 2. Subgraph Source Issue
The subgraph `metokens/1.0.2` might be:
- Not accessible
- Temporarily unavailable
- Network connectivity issues

### 3. SQL Transform Syntax Issue
The transforms using `SELECT *, `timestamp` AS block_timestamp` might have syntax issues:
- Backticks might not be supported in Flink SQL
- `SELECT *` with additional columns might cause issues
- Column name conflicts

## Troubleshooting Steps

### Step 1: Verify Secret Exists
```bash
goldsky secret list
```

Look for `POSTGRES_SECRET_CMJIQCIFZ0` in the list.

### Step 2: Test Secret Connection
If the secret exists, verify it's working:
```bash
# Check secret details (if supported)
goldsky secret get POSTGRES_SECRET_CMJIQCIFZ0
```

### Step 3: Verify Subgraph is Accessible
Test the subgraph endpoint:
```bash
curl -X POST https://api.goldsky.com/api/public/project_cmh0iv6s500dbw2p22vsxcfo6/subgraphs/metokens/1.0.2/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ subscribes(first: 1) { id } }"}'
```

### Step 4: Check Pipeline Logs
In Goldsky dashboard:
1. Go to: https://app.goldsky.com/dashboard/pipelines
2. Find `pipeline-metokens-all`
3. Check the logs for more specific error messages
4. Look for which component is failing (source, transform, or sink)

### Step 5: Fix SQL Transform Syntax (If Needed)

If the issue is with the SQL transforms, try removing backticks:

**Current (might have issues):**
```sql
SELECT 
  *,
  `timestamp` AS block_timestamp
FROM metoken_subscribes_source
```

**Alternative 1: Remove backticks**
```sql
SELECT 
  *,
  timestamp AS block_timestamp
FROM metoken_subscribes_source
```

**Alternative 2: Explicitly list fields (if SELECT * causes issues)**
```sql
SELECT 
  vid,
  id,
  meToken,
  owner,
  -- ... all other fields ...
  timestamp AS block_timestamp
FROM metoken_subscribes_source
```

## Quick Fix: Test Without Transforms

To isolate the issue, temporarily remove transforms and see if the connection works:

```yaml
transforms: {}
sinks:
  postgres_metoken_subscribes:
    from: metoken_subscribes_source  # Direct from source
```

If this works, the issue is with the transforms. If it still fails, the issue is with the source or sink.

## Most Likely Fix

Based on the error pattern, the most likely issue is:

1. **Secret doesn't exist or is invalid** - Check `goldsky secret list`
2. **SQL transform syntax** - The backticks around `timestamp` might not be needed or might be causing issues

Try removing the backticks first:
```yaml
sql: >-
  SELECT 
    *,
    timestamp AS block_timestamp
  FROM metoken_subscribes_source
```

## Next Steps

1. Check secret exists: `goldsky secret list`
2. Check pipeline logs in dashboard for specific error
3. Try removing backticks from SQL transforms
4. If still failing, test without transforms to isolate the issue
