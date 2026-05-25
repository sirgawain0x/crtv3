-- Supabase Security Advisor remediation
-- Run in Supabase Dashboard → SQL Editor
-- See also: supabase/migrations/20260525120000_fix_security_advisor_warnings.sql

-- 1) Function search_path
CREATE OR REPLACE FUNCTION public.search_video_assets(
  search_query text,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id integer, title text, asset_id text, category text, location text,
  playback_id text, description text, creator_id text, status text,
  thumbnail_url text, duration integer, views_count integer, likes_count integer,
  is_minted boolean, created_at timestamptz, updated_at timestamptz, rank real
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT va.id, va.title, va.asset_id, va.category, va.location, va.playback_id,
    va.description, va.creator_id, va.status, va.thumbnail_url, va.duration,
    va.views_count, va.likes_count, va.is_minted, va.created_at, va.updated_at,
    ts_rank(va.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM video_assets va
  WHERE va.status = 'published'
    AND va.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC, va.created_at DESC
  LIMIT result_limit OFFSET result_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_metoken_stats(metoken_addr TEXT)
RETURNS TABLE (
  total_transactions BIGINT, unique_holders BIGINT,
  total_volume NUMERIC, avg_transaction_size NUMERIC
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(mt.id),
    COUNT(DISTINCT mb.user_address),
    COALESCE(SUM(CASE WHEN mt.transaction_type IN ('mint','burn') THEN mt.collateral_amount ELSE mt.amount END), 0),
    CASE WHEN COUNT(mt.id) > 0 THEN
      COALESCE(SUM(CASE WHEN mt.transaction_type IN ('mint','burn') THEN mt.collateral_amount ELSE mt.amount END), 0) / COUNT(mt.id)
    ELSE 0 END
  FROM metoken_transactions mt
  LEFT JOIN metoken_balances mb ON mb.metoken_id = mt.metoken_id
  WHERE mt.metoken_id = (SELECT id FROM metokens WHERE address = metoken_addr);
END;
$$;

CREATE OR REPLACE FUNCTION public.search_metokens(search_query TEXT, result_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID, address TEXT, owner_address TEXT, name TEXT, symbol TEXT,
  total_supply NUMERIC, tvl NUMERIC, hub_id INTEGER, balance_pooled NUMERIC,
  balance_locked NUMERIC, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ,
  end_cooldown TIMESTAMPTZ, target_hub_id INTEGER, migration_address TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, rank REAL
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT m.*, ts_rank(to_tsvector('english', m.name || ' ' || m.symbol), plainto_tsquery('english', search_query)) AS rank
  FROM metokens m
  WHERE to_tsvector('english', m.name || ' ' || m.symbol) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, m.tvl DESC LIMIT result_limit;
END;
$$;

-- 2) Move pg_trgm out of public
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION IF EXISTS pg_trgm SET SCHEMA extensions;

-- 3) Revoke public RPC on get_wallet_address (unused by app RLS)
REVOKE ALL ON FUNCTION public.get_wallet_address() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_wallet_address() FROM anon, authenticated;

-- 4) comment_likes: public SELECT only (writes use service role)
DROP POLICY IF EXISTS "Public access for comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Anyone can read comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Anyone can like comments" ON public.comment_likes;
CREATE POLICY "Likes - select public" ON public.comment_likes FOR SELECT TO public USING (true);

-- 5) video_comments: remove open UPDATE (updates use service role)
DROP POLICY IF EXISTS "Anyone can update comments" ON public.video_comments;
