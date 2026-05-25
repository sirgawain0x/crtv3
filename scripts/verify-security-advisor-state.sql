-- Run after fix-security-advisor-warnings.sql to confirm all 8 warnings should clear

-- 1) Functions: expect proconfig containing search_path= (empty)
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS security_definer,
  p.proconfig AS function_options
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('search_video_assets', 'search_metokens', 'get_metoken_stats', 'get_wallet_address')
ORDER BY p.proname;

-- 2) pg_trgm schema (expect extensions, not public)
SELECT e.extname, n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname = 'pg_trgm';

-- 3) Permissive write RLS (expect zero rows)
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('comment_likes', 'video_comments')
  AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  AND (
    cmd = 'ALL'
    OR qual IS NOT DISTINCT FROM 'true'
    OR with_check IS NOT DISTINCT FROM 'true'
  );

-- 4) EXECUTE on get_wallet_address (anon/authenticated should be false)
SELECT
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_wallet_address';
