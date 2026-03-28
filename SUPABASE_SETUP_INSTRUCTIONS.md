# Supabase Database Setup Instructions

## Issue: Missing `creator_profiles` Table

The application is failing with the error: "Could not find the table 'public.creator_profiles' in the schema cache"

This happens because the `creator_profiles` table has not been created in the Supabase database yet.

## Solution

### Option 1: Run the Database Migration (Recommended)

1. **Access your Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your project
   - Go to the SQL Editor

2. **Execute the Migration Script**
   Copy and paste the following SQL into the SQL Editor and run it:

```sql
-- Creator Profiles table (replacing OrbisDB metadata)
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address TEXT UNIQUE NOT NULL, -- Creator's wallet address (primary key)
  username TEXT,
  bio TEXT,
  avatar_url TEXT, -- URL to avatar image stored on IPFS via Lighthouse
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator profiles indexes
CREATE INDEX IF NOT EXISTS idx_creator_profiles_owner ON creator_profiles(owner_address);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles(username);

-- Enable Row Level Security
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for creator_profiles table
CREATE POLICY "Anyone can view creator profiles" ON creator_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON creator_profiles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'address' = owner_address);

CREATE POLICY "Users can update their own profile" ON creator_profiles
  FOR UPDATE USING (auth.jwt() ->> 'address' = owner_address);

CREATE POLICY "Users can delete their own profile" ON creator_profiles
  FOR DELETE USING (auth.jwt() ->> 'address' = owner_address);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_creator_profiles_updated_at 
  BEFORE UPDATE ON creator_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Option 2: Use the Complete Schema

If you want to set up the entire database schema, run the complete schema from `lib/sdk/supabase/schema.sql` in your Supabase SQL Editor.

## Verification

After running the migration, you can verify the table was created by:

1. Going to the Table Editor in your Supabase dashboard
2. You should see the `creator_profiles` table listed
3. The table should have the following columns:
   - `id` (UUID, Primary Key)
   - `owner_address` (TEXT, Unique)
   - `username` (TEXT, Nullable)
   - `bio` (TEXT, Nullable)
   - `avatar_url` (TEXT, Nullable)
   - `created_at` (Timestamp)
   - `updated_at` (Timestamp)

## Fallback Behavior

The application has been updated to handle the missing table gracefully:

- **Read operations** (GET) will return `null` instead of throwing an error
- **Write operations** (POST, PUT, DELETE) will throw a clear error message asking to run the migration
- Console warnings will be logged when the table is missing

## Next Steps

1. Run the migration script in your Supabase dashboard
2. Test the creator profile functionality in your application
3. The error should be resolved and creator profiles should work normally

## Troubleshooting

If you continue to have issues:

1. **Check RLS Policies**: Ensure Row Level Security policies are properly set up
2. **Verify Permissions**: Make sure your Supabase project has the correct permissions
3. **Check Environment Variables**: Ensure your Supabase URL and API keys are correct
4. **Review Logs**: Check the Supabase logs for any additional error messages

## Support

If you need help with the migration or encounter any issues, please check:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
