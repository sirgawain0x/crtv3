-- Comprehensive verification queries for video_comments RLS setup
-- Run these after applying the RLS fix and index optimization migrations

-- 1. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'video_comments';

-- Expected: rls_enabled = true

-- 2. Verify INSERT policy exists and is correct
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

-- Expected: 1 row with:
-- - policyname = 'Comments - insert own'
-- - cmd = 'INSERT'
-- - roles = '{authenticated}'
-- - with_check contains ownership verification

-- 3. Verify all indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'video_comments'
ORDER BY indexname;

-- Expected indexes:
-- - idx_video_comments_commenter (on commenter_address)
-- - idx_video_comments_commenter_lower (on LOWER(commenter_address)) - NEW
-- - idx_video_comments_video_asset (on video_asset_id)
-- - idx_video_comments_parent (on parent_comment_id)
-- - idx_video_comments_created_at (on created_at)
-- Plus primary key index

-- 4. Count total INSERT policies (should be exactly 1)
SELECT COUNT(*) as insert_policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'video_comments'
  AND cmd = 'INSERT';

-- Expected: insert_policy_count = 1
