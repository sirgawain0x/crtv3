# Video Comments RLS Security Fix

## Issue Summary

The `public.video_comments` table had an overly permissive RLS INSERT policy:

- **Policy Name**: "Anyone can create comments"
- **Problem**: Used `WITH CHECK (TRUE)` which allows any authenticated (or public) user to insert any row
- **Security Risk**: High - users could create comments claiming to be another user, bypassing ownership checks
- **Impact**: Unauthorized data creation, potential data integrity issues

## Solution Applied

### Migration: `20260123_fix_video_comments_rls_insert.sql`

Replaced the permissive policy with a secure policy that enforces ownership at the database level:

#### Secure INSERT Policy - Owner-Only Creation
```sql
CREATE POLICY "Comments - insert own"
  ON video_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    LOWER(commenter_address) = LOWER(
      COALESCE(
        NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''),
        NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')
      )
    )
    AND video_asset_id IS NOT NULL
    AND LENGTH(TRIM(content)) > 0
  );
```

**Security Features:**
- ✅ **Ownership Verification**: Users can only create comments with their own wallet address
- ✅ **Authentication Required**: Only `authenticated` users can insert (not `public`)
- ✅ **Data Validation**: Ensures `video_asset_id` and `content` are valid
- ✅ **Prevents Impersonation**: Users cannot create comments claiming to be someone else

## Authentication Model

This application uses **wallet address-based authentication** (EIP-4337 Smart Accounts):

- Wallet addresses are stored in JWT claims: `request.jwt.claim.address`
- The `commenter_address` column stores the wallet address of the user who made the comment
- Policies compare the JWT claim to the `commenter_address` column to verify ownership
- Falls back to `request.jwt.claim.sub` if address claim is not available

## Performance Considerations

### Existing Indexes
The table already has appropriate indexes:
- `idx_video_comments_commenter` on `commenter_address` - used in INSERT policy
- `idx_video_comments_video_asset` on `video_asset_id` - used for FK validation

### Auth Context Optimization
The policy uses `(SELECT current_setting(...))` pattern to ensure the JWT claim is evaluated once per query instead of once per row, following Supabase Performance Advisor recommendations.

## Verification

After applying the migration, verify the policy:

```sql
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
- `with_check` contains ownership verification condition

## Testing Recommendations

Test the following scenarios:

1. **Authenticated Insert (Own Address)**: User can INSERT comment with their own wallet address ✅
2. **Unauthorized Insert (Different Address)**: User cannot INSERT comment with another user's address ❌
3. **Unauthenticated Insert**: Unauthenticated user cannot INSERT comments ❌
4. **Invalid Data**: User cannot INSERT comment with null `video_asset_id` or empty `content` ❌

## Related Security Improvements

This fix follows the same secure pattern used in other tables:
- `comment_likes` - Uses similar ownership verification for INSERT/DELETE
- `metoken_balances` - Verifies `user_address` matches JWT claim
- `creator_profiles` - Verifies `owner_address` matches JWT claim

## Summary

✅ **Fixed**: The `video_comments` table now has a secure RLS INSERT policy that:
- Restricts INSERT to authenticated users only
- Enforces ownership verification at the database level
- Prevents users from creating comments with someone else's address
- Validates required fields (`video_asset_id`, `content`)

🔒 **Security**: The table is now properly secured at the database level, preventing unauthorized comment creation and impersonation attacks.
