-- creative-tv (zdeiezfoemibjgrkyzvs) hardening migration: audit fixes #2, #5, #6, #7
-- Generated from live catalog state read at about 8:10 PM ET.
--
-- Anon write exceptions: NONE.
--   Supabase API logs, Nov 10 8:05 PM to Nov 17 8:05 PM ET: 0 POST/PATCH/DELETE/rpc by anon or
--   authenticated on any table. Every write was service_role.
--   Every anon/authenticated write path in code (staging 1f6c36cc) is a service-key-missing
--   fallback, an unused method, a table that doesn't exist in this DB, or already blocked by RLS.
--   No anon JWT carries request.jwt.claim.* and auth.users is now empty.
--
-- Not covered here: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin. postgres can't alter another
--   role's defaults, so tables that supabase_admin creates later still default to anon=arwdDxtm.
--   Every current public table is owned by postgres.
-- MAINTAIN (PG17 'm') is left as is. It isn't reachable through PostgREST.

-- #2 anon: revoke all write-class privileges on every public table and view

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.campaign_stickers FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.comment_likes FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.creator_collections FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.creator_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.creator_profiles_backup_20261027 FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.hack_beta_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.hack_beta_submissions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_analytics FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_balances FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_burn_stats FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_burns FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_mints FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_overview FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_registers FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_subscribes FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_trading_activity FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_transactions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metokens FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.notifications FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.prediction_market_creations FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.prediction_video_links FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.public_video_assets FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.push_deliveries FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.push_subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.reality_social_sync_state FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.recent_metoken_burns FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.shoppable_annotations FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.shoppable_campaigns FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.shoppable_product_kits FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.shoppable_videos FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.song_cup_submissions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.source_1 FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sticker_claims FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sticker_tips FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.streams FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.video_assets FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.video_collaborators FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.video_comments FROM anon;

-- #2 authenticated: revoke TRUNCATE, TRIGGER, REFERENCES (keeps INSERT/UPDATE/DELETE except streams, below)
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.campaign_stickers FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.comment_likes FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.creator_collections FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.creator_profiles FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.creator_profiles_backup_20261027 FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.hack_beta_settings FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.hack_beta_submissions FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_analytics FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_balances FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_burn_stats FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_burns FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_mints FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_overview FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_registers FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_subscribes FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_trading_activity FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metoken_transactions FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.metokens FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.notifications FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.prediction_market_creations FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.prediction_video_links FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.public_video_assets FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.push_deliveries FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.push_subscriptions FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.reality_social_sync_state FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.recent_metoken_burns FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.shoppable_annotations FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.shoppable_campaigns FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.shoppable_product_kits FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.shoppable_videos FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.song_cup_submissions FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.source_1 FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sticker_claims FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.sticker_tips FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.streams FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.video_assets FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.video_collaborators FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.video_comments FROM authenticated;

-- #2 default privileges for future tables created by postgres in public
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM authenticated;

-- #5 backup table: no API access at all
REVOKE ALL ON TABLE public.creator_profiles_backup_20261027 FROM anon, authenticated;

-- #6 UPDATE policies: add WITH CHECK identical to USING (stops changing owner_address to someone else)
ALTER POLICY "Users can update their own profile" ON public.creator_profiles
  WITH CHECK (COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')) = owner_address);
ALTER POLICY "Users can update their own metokens" ON public.metokens
  WITH CHECK (COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')) = owner_address);

-- #7 streams: no authenticated writes (all app writes use service_role)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.streams FROM authenticated;
DROP POLICY IF EXISTS "Creators can insert their own stream" ON public.streams;
DROP POLICY IF EXISTS "Creators can update their own stream" ON public.streams;
DROP POLICY IF EXISTS "Creators can delete their own stream" ON public.streams;



-- ============================================================================================
-- #3 (included in this migration). metoken_drop_jwt_claim_write_policies
-- Every metoken sync writer uses service_role. The only non-service writers can't succeed today
-- (see report).
-- ============================================================================================
DROP POLICY IF EXISTS "Users can insert their own balances" ON public.metoken_balances;
DROP POLICY IF EXISTS "Users can update their own balances" ON public.metoken_balances;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.metoken_transactions;
DROP POLICY IF EXISTS "Users can insert their own metokens" ON public.metokens;
DROP POLICY IF EXISTS "Users can update their own metokens" ON public.metokens;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.metokens, public.metoken_balances, public.metoken_transactions FROM anon, authenticated;

