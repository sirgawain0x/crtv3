# Step-by-Step: Creating the Goldsky Secret

## The Issue
The connection string had square brackets `[WQWvx9tfg5pny]` around the password, which are not part of the actual password.

## Correct Steps

Run:
```bash
goldsky secret create
```

Then follow these prompts **exactly**:

### 1. Select secret type
- Use arrow keys to select: **`jdbc`**
- Press Enter

### 2. Select input method
- Use arrow keys to select: **`Provide connection string`**
- Press Enter

### 3. Connection string
Enter (WITHOUT square brackets):
```
postgresql://postgres:WQWvx9tfg5pny@db.zdeiezfoemibjgrkyzvs.supabase.co:5432/postgres
```

**Important:** Remove the `[` and `]` brackets around the password!

### 4. Secret name
Enter:
```
SUPABASE_CONNECTION
```

**Important:** This must match exactly what's in your pipeline config (`pipelines/pipeline-from-metokens.yaml`)

### 5. Description (optional)
Enter something like:
```
Supabase PostgreSQL connection for MeToken pipeline
```

## If Connection Still Fails

### Check 1: Verify Password
1. Go to: https://app.supabase.com/project/zdeiezfoemibjgrkyzvs
2. Settings → Database
3. If you're not sure of the password, click **"Reset database password"**
4. Use the new password in the connection string

### Check 2: Use Connection Pooling (Recommended)
Instead of the direct connection, try the **Connection pooling** URI from Supabase:
1. In Supabase Dashboard → Settings → Database
2. Scroll to **Connection pooling** section
3. Copy the **Session mode** URI
4. It will look like:
   ```
   postgresql://postgres.zdeiezfoemibjgrkyzvs:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

### Check 3: IP Allowlist
Supabase might have IP restrictions. Check:
1. Supabase Dashboard → Settings → Database
2. Look for **Connection pooling** or **Network restrictions**
3. Make sure Goldsky's IPs are allowed (or disable restrictions temporarily for testing)

## After Successful Creation

Verify the secret exists:
```bash
goldsky secret list
```

You should see `SUPABASE_CONNECTION` in the list.

Then redeploy your pipeline:
```bash
goldsky pipeline apply pipelines/pipeline-from-metokens.yaml --status ACTIVE
```

