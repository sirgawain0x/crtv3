-- ROLLBACK for creative-tv hardening (#2/#5/#6/#7) and, separately, #3.
-- Restores the exact anon/authenticated table grants, default ACLs and policies read live on 2026-11-17 at about 8:10 PM ET.

-- #2 restore anon/authenticated table privileges (only those that existed before)
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.campaign_stickers TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.campaign_stickers TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.comment_likes TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.comment_likes TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.creator_collections TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.creator_collections TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.creator_profiles TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.creator_profiles TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.hack_beta_settings TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.hack_beta_settings TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.hack_beta_submissions TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.hack_beta_submissions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_analytics TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_analytics TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_balances TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_balances TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_burn_stats TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_burn_stats TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_burns TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_burns TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_mints TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_mints TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_overview TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_overview TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_registers TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_registers TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_subscribes TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_subscribes TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_trading_activity TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_trading_activity TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metoken_transactions TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metoken_transactions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.metokens TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.metokens TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notifications TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.notifications TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.prediction_market_creations TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.prediction_market_creations TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.prediction_video_links TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.prediction_video_links TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.public_video_assets TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.public_video_assets TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.push_deliveries TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.push_deliveries TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.push_subscriptions TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.push_subscriptions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.recent_metoken_burns TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.recent_metoken_burns TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shoppable_annotations TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.shoppable_annotations TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shoppable_campaigns TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.shoppable_campaigns TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shoppable_product_kits TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.shoppable_product_kits TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shoppable_videos TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.shoppable_videos TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.song_cup_submissions TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.song_cup_submissions TO authenticated;
GRANT REFERENCES, TRIGGER ON TABLE public.source_1 TO anon;
GRANT REFERENCES, TRIGGER ON TABLE public.source_1 TO authenticated;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.sticker_claims TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.sticker_claims TO authenticated;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.sticker_tips TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.sticker_tips TO authenticated;
GRANT REFERENCES ON TABLE public.streams TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.streams TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.video_assets TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.video_assets TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.video_collaborators TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.video_collaborators TO authenticated;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.video_comments TO anon;
GRANT REFERENCES, TRIGGER, TRUNCATE ON TABLE public.video_comments TO authenticated;

-- #2 restore default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT TRUNCATE, TRIGGER, REFERENCES ON TABLES TO authenticated;

-- #5 restore backup table grants (pre-change: full DML + TRUNCATE/TRIGGER/REFERENCES for both roles)
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.creator_profiles_backup_20261027 TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.creator_profiles_backup_20261027 TO authenticated;

-- #6 remove the added WITH CHECK (pre-change: UPDATE policies had USING only)
-- ALTER POLICY can't unset WITH CHECK, so recreate both policies as they were
DROP POLICY IF EXISTS "Users can update their own profile" ON public.creator_profiles;
CREATE POLICY "Users can update their own profile" ON public.creator_profiles
  AS PERMISSIVE FOR UPDATE TO public
  USING (COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')) = owner_address);
DROP POLICY IF EXISTS "Users can update their own metokens" ON public.metokens;
CREATE POLICY "Users can update their own metokens" ON public.metokens
  AS PERMISSIVE FOR UPDATE TO public
  USING (COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')) = owner_address);

-- #7 restore streams authenticated writes and the three policies
GRANT INSERT, UPDATE, DELETE ON TABLE public.streams TO authenticated;
CREATE POLICY "Creators can insert their own stream" ON public.streams
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (creator_id = lower(((SELECT auth.jwt()) ->> 'sub'::text)));
CREATE POLICY "Creators can update their own stream" ON public.streams
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (creator_id = lower(((SELECT auth.jwt()) ->> 'sub'::text)))
  WITH CHECK (creator_id = lower(((SELECT auth.jwt()) ->> 'sub'::text)));
CREATE POLICY "Creators can delete their own stream" ON public.streams
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (creator_id = lower(((SELECT auth.jwt()) ->> 'sub'::text)));

-- ============================================================================================
-- ROLLBACK for #3 (only if #3 was applied). If both were applied, run this block first,
-- then the block above (the metokens UPDATE policy recreate above would otherwise conflict).
-- ============================================================================================
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.metokens, public.metoken_balances, public.metoken_transactions TO authenticated;
-- GRANT INSERT, UPDATE, DELETE ON TABLE public.metokens, public.metoken_balances, public.metoken_transactions TO anon;  -- only if #2 is also being rolled back
-- CREATE POLICY "Users can insert their own balances" ON public.metoken_balances AS PERMISSIVE FOR INSERT TO public
--   WITH CHECK (COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')) = user_address);
-- CREATE POLICY "Users can update their own balances" ON public.metoken_balances AS PERMISSIVE FOR UPDATE TO public
--   USING (COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')) = user_address);
-- CREATE POLICY "Users can insert their own transactions" ON public.metoken_transactions AS PERMISSIVE FOR INSERT TO public
--   WITH CHECK (COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')) = user_address);
-- CREATE POLICY "Users can insert their own metokens" ON public.metokens AS PERMISSIVE FOR INSERT TO authenticated
--   WITH CHECK ((lower(COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), ''))) = lower(owner_address)) AND (owner_address IS NOT NULL) AND (address IS NOT NULL) AND (name IS NOT NULL) AND (symbol IS NOT NULL));
-- CREATE POLICY "Users can update their own metokens" ON public.metokens AS PERMISSIVE FOR UPDATE TO public
--   USING (COALESCE(NULLIF((SELECT current_setting('request.jwt.claim.address', true)), ''), NULLIF((SELECT current_setting('request.jwt.claim.sub', true)), '')) = owner_address);   -- skip if the #6 rollback above already recreated it

