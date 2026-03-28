# Video Comments RLS INSERT Policy Fix

## Issue
Error when creating comments:
```
new row violates row-level security policy for table "video_comments"
```

## Root Cause
The RLS INSERT policy for `video_comments` may be missing, incorrectly configured, or was dropped. The table has RLS enabled, but without a proper INSERT policy, all inserts are blocked.

## Solution

### Option 1: Apply Migration via Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to the **SQL Editor**

2. **Run the Migration**
   - Copy the entire contents of `supabase/migrations/20260123_fix_video_comments_rls_insert.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the migration

### Option 2: Apply via Supabase CLI

```bash
# Make sure you're in the project root
cd /Users/sirgawain/Developer/crtv3

# Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

## What This Migration Does

1. **Drops ALL existing INSERT policies** to ensure a clean state and prevent multiple permissive policy conflicts
2. **Creates a single secure INSERT policy** that enforces ownership at the database level
   - Policy name: "Comments - insert own" (matches naming pattern used in comment_likes)
   - Applies to: `authenticated` role only
   - Security checks:
     - Verifies `commenter_address` matches the authenticated user's wallet address from JWT claims
     - Ensures `video_asset_id` is not null
     - Ensures `content` is not empty
3. **Prevents unauthorized inserts** - users cannot create comments claiming to be someone else
4. **Uses optimized pattern** - `(SELECT current_setting(...))` for better performance

## Verification

After applying the migration, verify the policy exists:

```sql
-- Check if the INSERT policy exists
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'video_comments'
  AND cmd = 'INSERT';
```

Expected result:
- 1 row with `policyname = 'Comments - insert own'`
- `cmd = 'INSERT'`
- `roles = '{authenticated}'`
- `with_check` contains a condition verifying `commenter_address` matches JWT claim

## Testing

After applying the migration, test creating a comment:
1. Navigate to a video detail page
2. Try to create a new comment
3. The comment should be created successfully without the RLS error

## Notes

- **Security**: The policy enforces ownership at the database level - users can only create comments with their own wallet address
- **Authentication Required**: Only authenticated users can create comments (matches the app's authentication model)
- **Performance**: Uses optimized `(SELECT current_setting(...))` pattern to evaluate JWT claims once per query
- **Additional Validation**: The policy also ensures `video_asset_id` and `content` are valid (complements table constraints)
- **Pattern Consistency**: Follows the same secure pattern used in `comment_likes` and other tables in the codebase
