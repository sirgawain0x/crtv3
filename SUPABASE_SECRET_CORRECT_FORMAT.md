# Creating Goldsky Secret for Supabase - Correct Format

## ⚠️ Important: Supabase Requirements

According to Goldsky documentation:
- **Supabase direct connections (port 5432) don't work** - they only support IPv6
- **You MUST use Session Pooling** (port 6543) connection string
- **Secret must be in JSON format**, not connection string format

## Step 1: Get Session Pooling Connection Details

1. Go to: https://app.supabase.com/project/zdeiezfoemibjgrkyzvs
2. Navigate to **Settings** → **Database**
3. Scroll down to **Connection pooling** section
4. You'll see connection strings like:

   **Session mode:**
   ```
   postgresql://postgres.zdeiezfoemibjgrkyzvs:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

5. Extract these values:
   - **Host:** `aws-0-us-west-1.pooler.supabase.com` (your pooler host might be different!)
   - **Port:** `6543`
   - **User:** `postgres.zdeiezfoemibjgrkyzvs` (format: `postgres.[PROJECT_REF]`)
   - **Password:** Your database password
   - **Database:** `postgres`

## Step 2: Create the Secret with JSON Format

Use this command format:

```bash
goldsky secret create --name SUPABASE_CONNECTION --value '{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "YOUR_POOLER_HOST",
  "port": 6543,
  "databaseName": "postgres",
  "user": "postgres.zdeiezfoemibjgrkyzvs",
  "password": "YOUR_PASSWORD"
}'
```

### Example (replace with your actual values):

```bash
goldsky secret create --name SUPABASE_CONNECTION --value '{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "aws-0-us-west-1.pooler.supabase.com",
  "port": 6543,
  "databaseName": "postgres",
  "user": "postgres.zdeiezfoemibjgrkyzvs",
  "password": "WQWvx9tfg5pny"
}'
```

## Step 3: Verify the Secret

```bash
goldsky secret list
```

You should see `SUPABASE_CONNECTION` in the list.

## Step 4: Deploy Your Pipeline

```bash
goldsky pipeline apply pipelines/pipeline-from-metokens.yaml --status ACTIVE
```

## Troubleshooting

### "We could not establish a connection"

**Possible causes:**
1. **Wrong pooler host** - Your pooler host might be different. Check Supabase Dashboard for the exact hostname
2. **Wrong password** - Reset it in Supabase Dashboard → Settings → Database
3. **Wrong user format** - Should be `postgres.[PROJECT_REF]`, not just `postgres`
4. **Network restrictions** - Check if Supabase has IP allowlists enabled

**Solutions:**
1. Double-check the Session Pooling connection string in Supabase Dashboard
2. Reset your database password if unsure
3. Make sure you're using the **Session mode** connection string, not Transaction mode

### Finding Your Exact Pooler Host

The pooler host format is usually:
- `aws-0-[REGION].pooler.supabase.com` (AWS)
- `[REGION].pooler.supabase.com` (other providers)

Your exact host is shown in the Supabase Dashboard → Settings → Database → Connection pooling section.

### If Session Pooling Doesn't Work

According to Goldsky docs, you can:
1. Contact Supabase support about IPv4 add-on
2. Or use a different PostgreSQL provider that supports direct IPv4 connections

## Quick Reference

**Secret Name:** `SUPABASE_CONNECTION` (must match pipeline config)

**Required JSON Fields:**
- `type`: `"jdbc"`
- `protocol`: `"postgresql"`
- `host`: Your pooler host (from Supabase Dashboard)
- `port`: `6543` (Session Pooling port)
- `databaseName`: `"postgres"`
- `user`: `"postgres.zdeiezfoemibjgrkyzvs"` (format: `postgres.[PROJECT_REF]`)
- `password`: Your database password

