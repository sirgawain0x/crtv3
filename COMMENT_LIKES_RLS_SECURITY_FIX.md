# Comment Likes RLS Security Fix

## Issue Summary

The `public.comment_likes` table had an overly permissive RLS policy that effectively disabled Row-Level Security:

- **Policy Name**: "Public access for comment likes"
- **Problem**: Used `USING (true)` and `WITH CHECK (true)` for ALL operations
- **Impact**: Any authenticated (or potentially unauthenticated) user could read, insert, update, or delete any row in the table
- **Security Risk**: High - unauthorized data access and modification

## Solution Applied

### Migration: `fix_comment_likes_rls_security`

Replaced the permissive ALL policy with operation-specific policies that enforce proper access controls:

#### 1. SELECT Policy - Public Read Access
```sql
CREATE POLICY "Likes - select public"
  ON public.comment_likes
  FOR SELECT
  TO public
  USING (true);
```
- **Purpose**: Allows anyone to view likes on comments (public read)
- **Security**: Safe - read-only access

#### 2. INSERT Policy - Owner-Only Creation
```sql
CREATE POLICY "Likes - insert own"
  ON public.comment_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(
      NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''),
      NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')
    ) = liker_address
    AND comment_id IS NOT NULL
  );
```
- **Purpose**: Authenticated users can only create likes with their own wallet address
- **Security**: Prevents users from creating likes claiming to be someone else
- **Validation**: Ensures `comment_id` is not null

#### 3. UPDATE Policy - Disabled
- **Purpose**: No UPDATE policy created (likes should not be modified)
- **Security**: All updates are denied by default (secure by default)

#### 4. DELETE Policy - Owner-Only Deletion
```sql
CREATE POLICY "Likes - delete own"
  ON public.comment_likes
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''),
      NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')
    ) = liker_address
  );
```
- **Purpose**: Authenticated users can only delete (unlike) their own likes
- **Security**: Prevents users from deleting others' likes

## Authentication Model

This application uses **wallet address-based authentication** (EIP-4337 Smart Accounts) rather than Supabase user IDs:

- Wallet addresses are stored in JWT claims: `request.jwt.claim.address`
- The `liker_address` column stores the wallet address of the user who liked the comment
- Policies compare the JWT claim to the `liker_address` column to verify ownership

## Performance Considerations

### Existing Indexes
The table already has appropriate indexes for the RLS policies:
- `idx_comment_likes_liker` on `liker_address` - used in INSERT/DELETE policies
- `idx_comment_likes_comment` on `comment_id` - used for joins and filtering
- Unique constraint on `(comment_id, liker_address)` - prevents duplicate likes

### Auth Context Optimization
The policies use `(SELECT current_setting(...))` pattern to ensure the JWT claim is evaluated once per query instead of once per row, following Supabase Performance Advisor recommendations.

## Verification

After applying the migration, verify the policies:

```sql
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'comment_likes'
ORDER BY cmd;
```

Expected result:
- 1 SELECT policy (public read)
- 1 INSERT policy (authenticated, owner-only)
- 1 DELETE policy (authenticated, owner-only)
- 0 UPDATE policies (updates denied)

## Testing Recommendations

Test the following scenarios:

1. **Public Read**: Unauthenticated users can SELECT likes ✅
2. **Authenticated Insert**: User can INSERT like with their own address ✅
3. **Unauthorized Insert**: User cannot INSERT like with another user's address ❌
4. **Authenticated Delete**: User can DELETE their own likes ✅
5. **Unauthorized Delete**: User cannot DELETE others' likes ❌
6. **Update Attempt**: Any UPDATE should be denied ❌

## Related Security Issues

The Supabase Security Advisor also flagged similar issues on other tables:
- `public.metokens` - "Allow all inserts for development" policy
- `public.video_comments` - "Anyone can create comments" and "Anyone can update comments" policies

These should be addressed separately with similar secure policies.

## Summary

✅ **Fixed**: The `comment_likes` table now has proper RLS policies that:
- Allow public read access
- Restrict INSERT to authenticated users with their own wallet address
- Disallow UPDATE operations
- Restrict DELETE to authenticated users deleting their own likes

🔒 **Security**: The table is now properly secured at the database level, preventing unauthorized access and modification.
