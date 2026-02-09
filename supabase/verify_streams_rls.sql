-- Verification queries for public.streams RLS policies
-- Run these after applying 20260209_fix_streams_rls_performance.sql
-- Use Supabase SQL Editor or psql, switching auth context as needed.

-- =============================================================================
-- 1. Verify RLS and policies exist
-- =============================================================================
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'streams';

SELECT policyname, cmd, qual::text AS using_expr, with_check::text
FROM pg_policies
WHERE tablename = 'streams'
ORDER BY policyname;

-- =============================================================================
-- 2. Verify normalization trigger exists (creator_id stored lowercase)
-- =============================================================================
SELECT tgname AS trigger_name, proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.streams'::regclass
  AND tgname = 'streams_normalize_creator_id_trigger';

-- =============================================================================
-- 3. Test plan (run in each auth context)
-- =============================================================================
-- As owner (JWT sub = creator_id):
--   SELECT shows own row(s) and stream_key; INSERT/UPDATE/DELETE on own row allowed.
-- As another authenticated user:
--   SELECT/INSERT/UPDATE/DELETE restricted per policies (no access to other's rows).
-- As unauthenticated (anon):
--   Creator policies use TO authenticated, so INSERT/UPDATE/DELETE denied; SELECT follows
--   "Public can view streams" (if using(true), rows visible but stream_key exposure depends on app).
-- As service_role (server):
--   RLS bypassed; all operations succeed.
--
-- Policy behavior tests (examples below):

-- Example: as authenticated user with sub = '0xYourWalletAddress'
-- creator_id is normalized to lowercase by trigger; use any case on insert.
-- INSERT (must use own creator_id in WITH CHECK; stored as lower)
-- insert into public.streams (creator_id, stream_key, stream_id, playback_id)
-- values ('0xyourwalletaddress', 'secret-key', 'stream-id', 'playback-id');
-- Expected: success (trigger stores creator_id as lower).

-- insert into public.streams (creator_id, stream_key, stream_id, playback_id)
-- values ('0xOtherWallet', 'secret-key', 'stream-id', 'playback-id');
-- Expected: failure (WITH CHECK: creator_id must match JWT sub; TO authenticated).

-- SELECT (all rows visible if "Public can view streams" has using(true); stream_key visible to all with current setup)
-- select id, creator_id, stream_key, playback_id from public.streams;
-- As owner: expect to see own row(s). As other user: with current policies you may see all rows;
-- restrict stream_key exposure via a view if needed.

-- UPDATE (only own rows; creator_id is stored lowercase)
-- update public.streams set name = 'My Stream' where creator_id = '0xyourwalletaddress';
-- Expected as owner: success.
-- update public.streams set name = 'Hacked' where creator_id = '0xotherwallet';
-- Expected as non-owner: 0 rows updated (USING blocks row).

-- DELETE (only own rows)
-- delete from public.streams where creator_id = '0xotherwallet';
-- Expected as non-owner: 0 rows deleted.

-- =============================================================================
-- 4. EXPLAIN (ANALYZE, BUFFERS) — run as authenticated user
-- =============================================================================
-- Confirms auth is evaluated once per statement (InitPlan / SubPlan with single execution).
-- Look for (SELECT auth.jwt()) as a scalar subquery (single eval).
--
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT id, creator_id, stream_key FROM public.streams
-- WHERE creator_id = lower((SELECT auth.jwt()) ->> 'sub');
--
-- Or with a literal for a quick plan check (creator_id stored lowercase):
-- EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.streams WHERE creator_id = '0x...' LIMIT 1;
