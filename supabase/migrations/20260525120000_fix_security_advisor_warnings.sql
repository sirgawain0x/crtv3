-- Supabase Security Advisor remediation (all 8 warnings)
-- =============================================================================
-- 1) function_search_path_mutable — SET search_path = '' + schema-qualified refs
--    https://supabase.com/docs/guides/database/database-linter?lint=0011
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_video_assets(
  search_query text,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id integer,
  title text,
  asset_id text,
  category text,
  location text,
  playback_id text,
  description text,
  creator_id text,
  status text,
  thumbnail_url text,
  duration integer,
  views_count integer,
  likes_count integer,
  is_minted boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  rank real
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    va.id,
    va.title,
    va.asset_id,
    va.category,
    va.location,
    va.playback_id,
    va.description,
    va.creator_id,
    va.status,
    va.thumbnail_url,
    va.duration,
    va.views_count,
    va.likes_count,
    va.is_minted,
    va.created_at,
    va.updated_at,
    pg_catalog.ts_rank(
      va.search_vector,
      pg_catalog.websearch_to_tsquery('english', search_query)
    ) AS rank
  FROM public.video_assets AS va
  WHERE
    va.status = 'published'
    AND va.search_vector @@ pg_catalog.websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC, va.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_metoken_stats(metoken_addr text)
RETURNS TABLE (
  total_transactions bigint,
  unique_holders bigint,
  total_volume numeric,
  avg_transaction_size numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg_catalog.count(mt.id) AS total_transactions,
    pg_catalog.count(DISTINCT mb.user_address) AS unique_holders,
    pg_catalog.coalesce(
      pg_catalog.sum(
        CASE
          WHEN mt.transaction_type IN ('mint', 'burn') THEN mt.collateral_amount
          ELSE mt.amount
        END
      ),
      0
    ) AS total_volume,
    CASE
      WHEN pg_catalog.count(mt.id) > 0 THEN
        pg_catalog.coalesce(
          pg_catalog.sum(
            CASE
              WHEN mt.transaction_type IN ('mint', 'burn') THEN mt.collateral_amount
              ELSE mt.amount
            END
          ),
          0
        ) / pg_catalog.count(mt.id)
      ELSE 0
    END AS avg_transaction_size
  FROM public.metoken_transactions AS mt
  LEFT JOIN public.metoken_balances AS mb ON mb.metoken_id = mt.metoken_id
  WHERE mt.metoken_id = (
    SELECT m.id FROM public.metokens AS m WHERE m.address = metoken_addr
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.search_metokens(
  search_query text,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  address text,
  owner_address text,
  name text,
  symbol text,
  total_supply numeric,
  tvl numeric,
  hub_id integer,
  balance_pooled numeric,
  balance_locked numeric,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  end_cooldown timestamp with time zone,
  target_hub_id integer,
  migration_address text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  rank real
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.address,
    m.owner_address,
    m.name,
    m.symbol,
    m.total_supply,
    m.tvl,
    m.hub_id,
    m.balance_pooled,
    m.balance_locked,
    m.start_time,
    m.end_time,
    m.end_cooldown,
    m.target_hub_id,
    m.migration_address,
    m.created_at,
    m.updated_at,
    pg_catalog.ts_rank(
      pg_catalog.to_tsvector('english', m.name || ' ' || m.symbol),
      pg_catalog.plainto_tsquery('english', search_query)
    ) AS rank
  FROM public.metokens AS m
  WHERE pg_catalog.to_tsvector('english', m.name || ' ' || m.symbol)
    @@ pg_catalog.plainto_tsquery('english', search_query)
  ORDER BY rank DESC, m.tvl DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_video_assets(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_metoken_stats(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_metokens(text, integer) TO anon, authenticated;

-- =============================================================================
-- 2) extension_in_public — move pg_trgm to extensions schema
--    https://supabase.com/docs/guides/database/database-linter?lint=0014
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_extension
    WHERE extname = 'pg_trgm'
  ) THEN
    EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
  END IF;
END;
$$;

-- =============================================================================
-- 3) get_wallet_address — SECURITY INVOKER + no anon/authenticated EXECUTE
--    https://supabase.com/docs/guides/database/database-linter?lint=0028 / 0029
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_wallet_address()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT pg_catalog.nullif(
    pg_catalog.coalesce(
      pg_catalog.current_setting('request.jwt.claim.address', true),
      pg_catalog.current_setting('request.jwt.claim.sub', true)
    ),
    ''
  )::text;
$$;

REVOKE EXECUTE ON FUNCTION public.get_wallet_address() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_wallet_address() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_wallet_address() FROM authenticated;

-- =============================================================================
-- 4) rls_policy_always_true — remove permissive INSERT/UPDATE/DELETE/ALL
--    https://supabase.com/docs/guides/database/database-linter?lint=0024
--    SELECT with USING (true) is allowed by the linter (public read).
--    App writes use service_role (bypasses RLS).
-- =============================================================================

-- Known policy names (idempotent)
DROP POLICY IF EXISTS "Public access for comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Anyone can read comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Anyone can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Likes - insert own" ON public.comment_likes;
DROP POLICY IF EXISTS "Likes - delete own" ON public.comment_likes;

DROP POLICY IF EXISTS "Anyone can update comments" ON public.video_comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON public.video_comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.video_comments;

-- Drop any remaining permissive write policies (catches renames / drift)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('comment_likes', 'video_comments')
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      AND (
        cmd = 'ALL'
        OR qual IS NOT DISTINCT FROM 'true'
        OR with_check IS NOT DISTINCT FROM 'true'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  END LOOP;
END
$$;

-- comment_likes: public read only (SELECT + true is OK per linter)
DROP POLICY IF EXISTS "Likes - select public" ON public.comment_likes;
CREATE POLICY "Likes - select public"
  ON public.comment_likes
  FOR SELECT
  TO public
  USING (true);

-- video_comments: keep secure INSERT if present; ensure no open UPDATE remains
-- (Comments - insert own uses JWT ownership — not lint-flagged)
