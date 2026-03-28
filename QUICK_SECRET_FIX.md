# Quick Fix: Goldsky Secret Creation

## The Problem
- Connection string had brackets: `[WQWvx9tfg5pny]` ❌
- Wrong secret name: `JDBC_SECRET_CMJF5H2A30` ❌
- Connection test failed

## The Solution

### Step 1: Get the Correct Connection String

Go to Supabase Dashboard:
1. https://app.supabase.com/project/zdeiezfoemibjgrkyzvs
2. Settings → Database
3. Scroll to **Connection string** section
4. Copy the **URI** format (or use Connection pooling)

**Format should be:**
```
postgresql://postgres:YOUR_PASSWORD@db.zdeiezfoemibjgrkyzvs.supabase.co:5432/postgres
```

**OR use Connection Pooling (Recommended):**
```
postgresql://postgres.zdeiezfoemibjgrkyzvs:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### Step 2: Create the Secret

```bash
goldsky secret create
```

Enter:
1. **Type:** `jdbc` (use arrow keys)
2. **Method:** `Provide connection string`
3. **Connection string:** `postgresql://postgres:WQWvx9tfg5pny@db.zdeiezfoemibjgrkyzvs.supabase.co:5432/postgres`
   - ⚠️ **NO brackets around password!**
4. **Secret name:** `SUPABASE_CONNECTION`
   - ⚠️ **Must match your pipeline config exactly!**
5. **Description:** `Supabase connection for MeToken pipeline`

### Step 3: If Password is Wrong

If connection still fails:

1. **Reset the password:**
   - Supabase Dashboard → Settings → Database
   - Click "Reset database password"
   - Copy the new password
   - Use it in the connection string

2. **Or use Connection Pooling:**
   - More reliable for external connections
   - Get the URI from Connection pooling section
   - Use port 6543 (pooler) instead of 5432

### Step 4: Verify

```bash
goldsky secret list
```

Should show `SUPABASE_CONNECTION`

### Step 5: Deploy Pipeline

```bash
goldsky pipeline apply pipelines/pipeline-from-metokens.yaml --status ACTIVE
```

## Common Issues

### "We could not establish a connection"

**Causes:**
1. Wrong password → Reset it in Supabase
2. IP restrictions → Check Supabase network settings
3. Wrong host/port → Use connection pooling URI

**Solution:** Use Connection Pooling URI (port 6543) - it's more reliable for external services like Goldsky.

### "Secret name doesn't match"

Your pipeline config uses `SUPABASE_CONNECTION`, so the secret MUST be named exactly that.

