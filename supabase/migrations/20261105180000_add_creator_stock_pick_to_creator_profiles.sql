-- Creator Stock Picks (Path B PR1) — pin one o1 Base stock token on creator profile.
-- DO NOT APPLY without G2 approval (cloud agent writes migration only).

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS stock_pick jsonb;

COMMENT ON COLUMN public.creator_profiles.stock_pick IS
  'Optional Creator Stock Pick: { ticker, token_address, partner_url, note, video_asset_id }. Deep-link only; no custody.';
