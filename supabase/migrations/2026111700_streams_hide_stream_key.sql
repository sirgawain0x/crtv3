-- Hide stream_key from anon/authenticated via column-level SELECT grants.
-- NOTE: Any new column on public.streams must be added to the GRANT SELECT
-- column list below (or granted explicitly elsewhere); otherwise it will be
-- invisible to anon and authenticated roles.

REVOKE SELECT ON public.streams FROM anon, authenticated;

GRANT SELECT (
  id,
  creator_id,
  stream_id,
  playback_id,
  thumbnail_url,
  name,
  is_live,
  last_live_at,
  created_at,
  updated_at,
  allow_clipping,
  story_ip_id,
  story_license_terms_id,
  story_ip_registration_tx,
  story_ip_registered_at,
  story_commercial_rev_share,
  requires_metoken,
  metoken_price,
  lens_live_post_id,
  save_recording
) ON public.streams TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.streams FROM anon;

DROP POLICY IF EXISTS "Creators can view their own stream key" ON public.streams;