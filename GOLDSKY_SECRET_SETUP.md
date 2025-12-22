# Quick Guide: Creating the Goldsky Secret

## The Problem
Your pipeline is failing because the secret `SUPABASE_CONNECTION` doesn't exist in Goldsky.

## Solution: Create the Secret

### Method 1: Using the Helper Script (Easiest)

```bash
./scripts/create-goldsky-secret.sh
```

This script will:
1. Prompt you for your Supabase database password
2. Create the secret automatically in Goldsky

### Method 2: Manual Creation

#### Step 1: Get Your Supabase Connection String

**Option A: From Supabase Dashboard (Recommended)**
1. Go to: https://app.supabase.com/project/zdeiezfoemibjgrkyzvs
2. Navigate to **Settings** → **Database**
3. Scroll down to **Connection string** section
4. Copy the **URI** connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.zdeiezfoemibjgrkyzvs.supabase.co:5432/postgres
   ```
   
   **Note:** If you don't see the password, you may need to:
   - Click "Reset database password" to set a new one
   - Or use the connection pooling URI (see Option B)

**Option B: Connection Pooling URI (Better for Production)**
1. In the same Database settings page
2. Look for **Connection pooling** section
3. Copy the **Session mode** or **Transaction mode** URI
4. It will look like:
   ```
   postgresql://postgres.zdeiezfoemibjgrkyzvs:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

#### Step 2: Create the Secret in Goldsky

Once you have your connection string, run:

```bash
goldsky secret create SUPABASE_CONNECTION --value "postgresql://postgres:[YOUR-PASSWORD]@db.zdeiezfoemibjgrkyzvs.supabase.co:5432/postgres"
```

**Important:** 
- Replace `[YOUR-PASSWORD]` with your actual password
- If your password contains special characters, you may need to URL-encode them:
  - `:` becomes `%3A`
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `/` becomes `%2F`
  - etc.

#### Step 3: Verify the Secret

Check that the secret was created:

```bash
goldsky secret list
```

You should see `SUPABASE_CONNECTION` in the list.

#### Step 4: Redeploy Your Pipeline

Now you can deploy your pipeline:

```bash
goldsky pipeline apply pipelines/pipeline-from-metokens.yaml --status ACTIVE
```

## Troubleshooting

### Error: "Secret already exists"
If the secret already exists but with wrong credentials, update it:

```bash
goldsky secret update SUPABASE_CONNECTION --value "postgresql://postgres:[NEW-PASSWORD]@db.zdeiezfoemibjgrkyzvs.supabase.co:5432/postgres"
```

### Error: "Connection refused" or "Authentication failed"
- Double-check your database password
- Make sure you're using the correct connection string format
- Try using the connection pooling URI instead
- Verify your Supabase project is active

### Error: "Invalid connection string format"
Make sure your connection string:
- Starts with `postgresql://`
- Has the format: `postgresql://[user]:[password]@[host]:[port]/[database]`
- Has URL-encoded special characters in the password

## Quick Test

After creating the secret, you can test the connection:

```bash
# This will show if the secret exists (but won't reveal the value)
goldsky secret get SUPABASE_CONNECTION
```

## Next Steps

Once the secret is created:
1. ✅ Create the database tables (run the migration in Supabase SQL Editor)
2. ✅ Deploy your pipeline: `goldsky pipeline apply pipelines/pipeline-from-metokens.yaml --status ACTIVE`
3. ✅ Monitor the pipeline: `goldsky pipeline monitor pipeline-from-metokens`

