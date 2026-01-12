# Creating Goldsky Secret for Supabase Transaction Pooler

## Important Notes

1. **The `secret_name` field in pipeline configs expects a SECRET NAME, not a connection string**
2. **You need to create the secret in Goldsky first, then reference it by name**
3. **For Supabase + Goldsky, use JSON format with pooler connection details**

## Step 1: Extract Your Connection Details

From your Supabase Transaction Pooler connection string, extract:

- **Host:** `aws-1-us-east-2.pooler.supabase.com`
- **Port:** `6543`
- **Database:** `postgres`
- **User:** `postgres.zdeiezfoemibjgrkyzvs`
- **Password:** Your actual database password (replace `[YOUR-PASSWORD]`)

## Step 2: Create or Update the Secret

**Important:** For Supabase with Goldsky, use **JSON format**, not connection string format.

### If the Secret Doesn't Exist (Create):

```bash
goldsky secret create --name POSTGRES_SECRET_CMJIQCIFZ0 --value '{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "aws-1-us-east-2.pooler.supabase.com",
  "port": 6543,
  "databaseName": "postgres",
  "user": "postgres.zdeiezfoemibjgrkyzvs",
  "password": "YOUR_ACTUAL_PASSWORD_HERE"
}'
```

### If the Secret Already Exists (Update):

```bash
goldsky secret update POSTGRES_SECRET_CMJIQCIFZ0 --value '{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "aws-1-us-east-2.pooler.supabase.com",
  "port": 6543,
  "databaseName": "postgres",
  "user": "postgres.zdeiezfoemibjgrkyzvs",
  "password": "YOUR_ACTUAL_PASSWORD_HERE"
}'
```

**Note:** Use `goldsky secret update` (not `create`) if you see "Secret name already exists" error.

**Replace `YOUR_ACTUAL_PASSWORD_HERE` with your actual Supabase database password!**

### If you don't know your password:

1. Go to: https://app.supabase.com/project/zdeiezfoemibjgrkyzvs
2. Navigate to **Settings** → **Database**
3. Click **"Reset database password"** if needed
4. Use the new password in the secret

## Step 3: Verify the Secret

```bash
goldsky secret list
```

You should see `POSTGRES_SECRET_CMJIQCIFZ0` in the list.

## Step 4: Use in Pipeline

The `secret_name` field in your pipeline configs will reference this secret name:

```yaml
sinks:
  postgres_metoken_subscribes:
    secret_name: POSTGRES_SECRET_CMJIQCIFZ0  # <-- This is the secret NAME you created
    type: postgres
    ...
```

## Notes on Transaction vs Session Pooling

You're using **Transaction Pooler** which is fine. However:

- **Transaction Pooler** (port 6543) - Good for stateless applications, but **does not support PREPARE statements**
- **Session Pooler** (port 6543) - Supports PREPARE statements, better for some use cases

Goldsky pipelines typically work fine with Transaction Pooler. If you encounter issues with PREPARE statements, try using the Session Pooler connection string instead (also port 6543, but different connection parameters).

## Important: Secret Name Must Match

Make sure the secret name matches what's in your pipeline configs:

- Your pipeline configs use: `POSTGRES_SECRET_CMJIQCIFZ0`
- So create the secret with that exact name: `POSTGRES_SECRET_CMJIQCIFZ0`

## Quick Reference

**Secret Creation Command:**
```bash
goldsky secret create --name POSTGRES_SECRET_CMJIQCIFZ0 --value '{
  "type": "jdbc",
  "protocol": "postgresql",
  "host": "aws-1-us-east-2.pooler.supabase.com",
  "port": 6543,
  "databaseName": "postgres",
  "user": "postgres.zdeiezfoemibjgrkyzvs",
  "password": "YOUR_PASSWORD"
}'
```

**Pipeline Config Reference:**
```yaml
secret_name: POSTGRES_SECRET_CMJIQCIFZ0  # References the secret you created
```
