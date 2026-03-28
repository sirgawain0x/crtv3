-- Verification query: Check if the INSERT policy exists for video_comments
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

-- Expected result: 1 row with:
-- - policyname = 'Comments - insert own'
-- - cmd = 'INSERT'
-- - roles = '{authenticated}'
-- - with_check contains ownership verification condition
