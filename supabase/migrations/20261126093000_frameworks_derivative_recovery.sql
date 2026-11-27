-- Reviewed derivative recovery.
--
-- A re-encoded replacement for an import FrameWorks could not process, without
-- retrying the original upload. Narrowly scoped:
--
--   * no retry, reset or deletion of the original attempt — it stays quarantined
--     and protected, and its evidence becomes immutable once recorded;
--   * both identities are recorded: the archived original (source identity,
--     sha256, bytes) and the derivative (its own sha256, bytes, origin);
--   * adoption requires a ready, protected and playable replacement before the
--     import row changes which provider identity it points at;
--   * the legacy single-asset flow (`prepare_reviewed_frameworks_recovery`,
--     `adopt_verified_frameworks_recovery`) is left untouched, so existing
--     recoveries keep working.

ALTER TABLE public.frameworks_import_recoveries
  ADD COLUMN IF NOT EXISTS derivative_sha256 text,
  ADD COLUMN IF NOT EXISTS derivative_bytes bigint,
  ADD COLUMN IF NOT EXISTS derivative_origin text;

DO $$ BEGIN
  ALTER TABLE public.frameworks_import_recoveries ADD CONSTRAINT recovery_derivative_evidence
    CHECK (derivative_sha256 IS NULL OR (derivative_sha256 ~ '^[0-9a-f]{64}$' AND derivative_bytes > 0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.frameworks_import_recoveries ADD CONSTRAINT recovery_ready_needs_derivative
    CHECK (state <> 'ready' OR (derivative_sha256 IS NOT NULL AND derivative_bytes > 0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.frameworks_import_recoveries ADD CONSTRAINT recovery_derivative_differs
    CHECK (derivative_sha256 IS NULL OR derivative_sha256 <> source_sha256);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.frameworks_import_recoveries.derivative_sha256 IS
  'SHA-256 of the re-encoded replacement actually uploaded. Distinct from source_sha256, which is the archived original.';
COMMENT ON COLUMN public.frameworks_import_recoveries.derivative_origin IS
  'How the replacement was produced, e.g. transcode:h264-8bit. Reviewable provenance, not a free-form note.';

-- Extend the immutability trigger: the original columns keep their protection and
-- the derivative identity becomes immutable once set.
CREATE OR REPLACE FUNCTION public.preserve_frameworks_recovery_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (NEW.livepeer_asset_id,NEW.livepeer_playback_id,NEW.source_sha256,NEW.source_bytes,NEW.original_asset_id,NEW.original_playback_id,NEW.reason,NEW.reviewed_by,NEW.created_at)
 IS DISTINCT FROM (OLD.livepeer_asset_id,OLD.livepeer_playback_id,OLD.source_sha256,OLD.source_bytes,OLD.original_asset_id,OLD.original_playback_id,OLD.reason,OLD.reviewed_by,OLD.created_at)
 OR (OLD.frameworks_asset_id IS NOT NULL AND NEW.frameworks_asset_id IS DISTINCT FROM OLD.frameworks_asset_id)
 OR (OLD.frameworks_playback_id IS NOT NULL AND NEW.frameworks_playback_id IS DISTINCT FROM OLD.frameworks_playback_id)
 OR (OLD.adopted_at IS NOT NULL AND NEW.adopted_at IS DISTINCT FROM OLD.adopted_at)
 OR (OLD.derivative_sha256 IS NOT NULL AND NEW.derivative_sha256 IS DISTINCT FROM OLD.derivative_sha256)
 OR (OLD.derivative_bytes IS NOT NULL AND NEW.derivative_bytes IS DISTINCT FROM OLD.derivative_bytes)
 OR (OLD.derivative_origin IS NOT NULL AND NEW.derivative_origin IS DISTINCT FROM OLD.derivative_origin) THEN
 RAISE EXCEPTION 'Recovery evidence is immutable'; END IF;
 RETURN NEW;
END;
$$;

-- Record the reviewed substitution. Every value is supplied by the caller and
-- checked against the live row: nothing is hardcoded per asset.
CREATE OR REPLACE FUNCTION public.prepare_reviewed_derivative_recovery(
 p_source uuid,
 p_reviewer text,
 p_original_sha256 text,
 p_original_bytes bigint,
 p_derivative_sha256 text,
 p_derivative_bytes bigint,
 p_derivative_origin text,
 p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_source public.frameworks_asset_imports%ROWTYPE;
BEGIN
 IF p_reviewer IS NULL OR length(trim(p_reviewer))=0 THEN RAISE EXCEPTION 'A reviewer is required'; END IF;
 IF p_reason IS NULL OR length(trim(p_reason))=0 THEN RAISE EXCEPTION 'A review reason is required'; END IF;
 IF p_derivative_sha256 IS NULL OR p_derivative_sha256 !~ '^[0-9a-f]{64}$' OR p_derivative_bytes IS NULL OR p_derivative_bytes<=0 THEN
  RAISE EXCEPTION 'Derivative evidence is invalid'; END IF;
 IF p_derivative_sha256 = p_original_sha256 THEN RAISE EXCEPTION 'Derivative evidence duplicates the original bytes'; END IF;

 SELECT * INTO v_source FROM public.frameworks_asset_imports WHERE livepeer_asset_id=p_source FOR UPDATE;
 -- Only a quarantined attempt may be substituted: failed (post-upload processing)
 -- or ambiguous (pre/post-transfer uncertainty). A ready import is never replaced.
 IF NOT FOUND OR v_source.state NOT IN ('failed','ambiguous')
 OR v_source.source_sha256 IS DISTINCT FROM p_original_sha256
 OR v_source.source_bytes IS DISTINCT FROM p_original_bytes
 OR v_source.frameworks_asset_id IS NULL OR v_source.frameworks_playback_id IS NULL
 THEN RAISE EXCEPTION 'Original attempt evidence differs or is not quarantined'; END IF;

 INSERT INTO public.frameworks_import_recoveries(
  livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,original_asset_id,original_playback_id,
  derivative_sha256,derivative_bytes,derivative_origin,reason,reviewed_by)
 VALUES(v_source.livepeer_asset_id,v_source.livepeer_playback_id,v_source.source_sha256,v_source.source_bytes,
  v_source.frameworks_asset_id,v_source.frameworks_playback_id,
  p_derivative_sha256,p_derivative_bytes,trim(p_derivative_origin),trim(p_reason),lower(trim(p_reviewer)))
 ON CONFLICT (livepeer_asset_id) DO UPDATE
  SET derivative_sha256=EXCLUDED.derivative_sha256,derivative_bytes=EXCLUDED.derivative_bytes,
      derivative_origin=EXCLUDED.derivative_origin,updated_at=now()
  WHERE public.frameworks_import_recoveries.derivative_sha256 IS NULL
    AND public.frameworks_import_recoveries.state<>'ready';
END;
$$;

-- Adopt only a ready, evidence-matched replacement.
CREATE OR REPLACE FUNCTION public.adopt_reviewed_derivative_recovery(p_source uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_source public.frameworks_asset_imports%ROWTYPE;v_recovery public.frameworks_import_recoveries%ROWTYPE;
BEGIN
 SELECT * INTO v_source FROM public.frameworks_asset_imports WHERE livepeer_asset_id=p_source FOR UPDATE;
 SELECT * INTO STRICT v_recovery FROM public.frameworks_import_recoveries WHERE livepeer_asset_id=p_source FOR UPDATE;

 IF v_recovery.derivative_sha256 IS NULL OR v_recovery.derivative_bytes IS NULL THEN
  RAISE EXCEPTION 'Recovery has no derivative evidence'; END IF;
 IF v_recovery.state<>'ready' OR v_recovery.frameworks_asset_id IS NULL OR v_recovery.frameworks_playback_id IS NULL THEN
  RAISE EXCEPTION 'Replacement is not ready'; END IF;
 IF v_source.livepeer_playback_id IS DISTINCT FROM v_recovery.livepeer_playback_id
 OR v_source.source_sha256 IS DISTINCT FROM v_recovery.source_sha256
 OR v_source.source_bytes IS DISTINCT FROM v_recovery.source_bytes
 THEN RAISE EXCEPTION 'Recovery original evidence differs'; END IF;

 IF v_recovery.adopted_at IS NOT NULL THEN
  IF v_source.state='ready'
  AND v_source.frameworks_asset_id=v_recovery.frameworks_asset_id
  AND v_source.frameworks_playback_id=v_recovery.frameworks_playback_id THEN RETURN; END IF;
  RAISE EXCEPTION 'Adopted derivative mapping changed'; END IF;

 -- The original attempt must still be the quarantined one and must not have been
 -- referenced by the app in the meantime.
 IF v_source.state NOT IN ('failed','ambiguous')
 OR v_source.frameworks_asset_id IS DISTINCT FROM v_recovery.original_asset_id
 OR v_source.frameworks_playback_id IS DISTINCT FROM v_recovery.original_playback_id
 OR v_recovery.frameworks_asset_id=v_recovery.original_asset_id
 OR v_recovery.frameworks_playback_id=v_recovery.original_playback_id
 OR EXISTS(SELECT 1 FROM public.video_assets WHERE asset_id=v_recovery.original_asset_id OR playback_id=v_recovery.original_playback_id)
 OR EXISTS(SELECT 1 FROM public.frameworks_vod_access WHERE asset_id=v_recovery.original_asset_id OR playback_id=v_recovery.original_playback_id)
 THEN RAISE EXCEPTION 'Original attempt is no longer safely quarantined'; END IF;

 UPDATE public.frameworks_asset_imports
  SET state='ready',frameworks_asset_id=v_recovery.frameworks_asset_id,
      frameworks_playback_id=v_recovery.frameworks_playback_id,updated_at=now()
  WHERE livepeer_asset_id=p_source;
 UPDATE public.frameworks_import_recoveries SET adopted_at=now(),updated_at=now() WHERE livepeer_asset_id=p_source;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_reviewed_derivative_recovery(uuid,text,text,bigint,text,bigint,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.adopt_reviewed_derivative_recovery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_reviewed_derivative_recovery(uuid,text,text,bigint,text,bigint,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.adopt_reviewed_derivative_recovery(uuid) TO service_role;
