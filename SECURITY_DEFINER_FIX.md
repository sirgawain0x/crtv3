# Security Definer Fix for MeToken Views and Functions

## Issue Description

The Supabase security advisor detected that several database views and functions were defined with the `SECURITY DEFINER` property. This is a security concern because:

- **SECURITY DEFINER** executes with the privileges of the view/function creator
- This bypasses Row Level Security (RLS) policies of the querying user
- Could potentially expose data that should be restricted by RLS

## What Was Fixed

### Views Updated
1. `metoken_analytics` - Analytics view with trading metrics
2. `metoken_overview` - Overview with creator information
3. `metoken_trading_activity` - Trading activity metrics

### Functions Updated
1. `get_metoken_stats(metoken_addr TEXT)` - Statistics function
2. `search_metokens(search_query TEXT, result_limit INTEGER)` - Search function

## Changes Made

All views and functions were changed from `SECURITY DEFINER` to `SECURITY INVOKER`:

**Before:**
```sql
CREATE OR REPLACE VIEW metoken_analytics AS
SELECT ...

CREATE OR REPLACE FUNCTION get_metoken_stats(...)
...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**After:**
```sql
CREATE OR REPLACE VIEW metoken_analytics 
WITH (security_invoker=true) AS
SELECT ...

CREATE OR REPLACE FUNCTION get_metoken_stats(...)
...
SECURITY INVOKER
AS $$
...
$$ LANGUAGE plpgsql;
```

## How to Apply the Fix

### Option 1: Run the Migration (Recommended)

Execute the migration file in your Supabase SQL editor:

```bash
# Copy the contents of the migration file
cat supabase/migrations/fix_metoken_analytics_security.sql
```

Then paste and run it in:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Paste the migration contents
5. Click "Run"

### Option 2: Manual Application

If you have a fresh database, you can run the updated schema files:
- `lib/sdk/supabase/schema.sql`
- `lib/sdk/supabase/enhanced-schema.sql`

## Impact Assessment

✅ **No Breaking Changes**
- These views and functions only perform read operations
- All underlying tables already have public read RLS policies
- The behavior remains the same for legitimate users
- Only unauthorized access attempts would be blocked (as intended)

✅ **Security Improved**
- Views now respect the RLS policies of the querying user
- Functions no longer bypass security policies
- Follows PostgreSQL security best practices

## Verification

After applying the migration, verify the fix by checking the view definitions:

```sql
-- Check view security settings
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE viewname IN ('metoken_analytics', 'metoken_overview', 'metoken_trading_activity');

-- Check function security settings
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('get_metoken_stats', 'search_metokens');
```

Expected result: All should show `SECURITY INVOKER` or `security_invoker=true`.

## Files Modified

1. `lib/sdk/supabase/schema.sql` - Base schema with functions and views
2. `lib/sdk/supabase/enhanced-schema.sql` - Enhanced schema with additional views
3. `supabase/migrations/fix_metoken_analytics_security.sql` - Migration to fix existing database

## References

- [PostgreSQL View Documentation](https://www.postgresql.org/docs/current/sql-createview.html)
- [PostgreSQL Function Security](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/database-advisors)

