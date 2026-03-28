# Supabase RLS Solution for Creator Profiles

## Issue
The creator profiles table has Row Level Security (RLS) policies that require authentication, but our application uses Account Kit for authentication instead of Supabase Auth. This causes the error:

```
Failed to upsert creator profile: new row violates row-level security policy for table "creator_profiles"
```

## Solutions

### Option 1: Use Service Role Key (Recommended)
Add the Supabase service role key to your environment variables:

```bash
# Add to .env.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

The service role key bypasses RLS policies and allows server-side operations.

### Option 2: Update RLS Policies (Not Recommended for Production)

⚠️ **SECURITY WARNING**: The policies shown below are effectively unrestricted and allow any user to insert, update, or delete any data in the creator_profiles table. This approach is **NOT suitable for production environments** as it exposes your database to potential abuse and data manipulation.

**Recommended alternatives:**
- **Use Option 1** (service role key) for secure server-side operations
- Implement narrowly scoped RLS policies that validate user identity and permissions
- Use proper authentication checks within your RLS policies

If you can modify the database, update the RLS policies to be more permissive (for development/testing only):

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON creator_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON creator_profiles;

-- Create more permissive policies (DEVELOPMENT/TESTING ONLY)
CREATE POLICY "Allow public insert" ON creator_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON creator_profiles
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON creator_profiles
  FOR DELETE USING (true);
```

### Option 3: Disable RLS (Not Recommended for Production)
```sql
ALTER TABLE creator_profiles DISABLE ROW LEVEL SECURITY;
```

## Current Implementation
The application now uses an API route (`/api/creator-profiles/upsert`) that:
1. First tries to use the service role client (if configured)
2. Falls back to the regular client (if service role not available)
3. Provides clear error messages for configuration issues

## Getting the Service Role Key
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Copy the "service_role" key (not the "anon" key)
4. Add it to your environment variables

## Security Note
The service role key has full database access and bypasses RLS. Keep it secure and only use it in server-side code.
