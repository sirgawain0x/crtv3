-- Preserve the original uncertain attempt. A reviewed replacement is separate and never retries that upload.
CREATE TABLE public.frameworks_import_recoveries (
 livepeer_asset_id uuid PRIMARY KEY REFERENCES public.frameworks_asset_imports(livepeer_asset_id),
 livepeer_playback_id text NOT NULL,source_sha256 text NOT NULL,source_bytes bigint NOT NULL,
 original_asset_id text NOT NULL,original_playback_id text NOT NULL,
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','importing','processing','ready','ambiguous','failed')),
 frameworks_asset_id text UNIQUE,frameworks_playback_id text UNIQUE,
 reason text NOT NULL,reviewed_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),adopted_at timestamptz,
 CHECK(state<>'ready' OR (frameworks_asset_id IS NOT NULL AND frameworks_playback_id IS NOT NULL)),
 CHECK(frameworks_asset_id IS NULL OR frameworks_asset_id<>original_asset_id),
 CHECK(frameworks_playback_id IS NULL OR frameworks_playback_id<>original_playback_id)
);
ALTER TABLE public.frameworks_import_recoveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.frameworks_import_recoveries FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.frameworks_import_recoveries TO service_role;

CREATE FUNCTION public.preserve_frameworks_recovery_evidence() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (NEW.livepeer_asset_id,NEW.livepeer_playback_id,NEW.source_sha256,NEW.source_bytes,NEW.original_asset_id,NEW.original_playback_id,NEW.reason,NEW.reviewed_by,NEW.created_at)
 IS DISTINCT FROM (OLD.livepeer_asset_id,OLD.livepeer_playback_id,OLD.source_sha256,OLD.source_bytes,OLD.original_asset_id,OLD.original_playback_id,OLD.reason,OLD.reviewed_by,OLD.created_at)
 OR (OLD.frameworks_asset_id IS NOT NULL AND NEW.frameworks_asset_id IS DISTINCT FROM OLD.frameworks_asset_id)
 OR (OLD.frameworks_playback_id IS NOT NULL AND NEW.frameworks_playback_id IS DISTINCT FROM OLD.frameworks_playback_id)
 OR (OLD.adopted_at IS NOT NULL AND NEW.adopted_at IS DISTINCT FROM OLD.adopted_at) THEN
 RAISE EXCEPTION 'Recovery evidence is immutable'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.preserve_frameworks_recovery_evidence() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.preserve_frameworks_recovery_evidence() TO service_role;
CREATE TRIGGER preserve_frameworks_recovery_evidence BEFORE UPDATE ON public.frameworks_import_recoveries
 FOR EACH ROW EXECUTE FUNCTION public.preserve_frameworks_recovery_evidence();

CREATE FUNCTION public.prepare_reviewed_frameworks_recovery(p_reviewer text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_source public.frameworks_asset_imports%ROWTYPE;
BEGIN
 SELECT * INTO v_source FROM public.frameworks_asset_imports WHERE livepeer_asset_id='bd18c602-9323-4b6e-aa90-7f8e8065e416' FOR UPDATE;
 IF NOT FOUND OR v_source.state<>'ambiguous'
 OR v_source.livepeer_playback_id IS DISTINCT FROM 'bd18hlmb6vazgsy8'
 OR v_source.source_sha256 IS DISTINCT FROM 'ab4ea28fdac612cf2f1f588ace9691683ac85fe3e9c84193e0e0c044a111313e'
 OR v_source.source_bytes<>160998594
 OR v_source.frameworks_asset_id IS DISTINCT FROM '202611241631464302d8bfdb5ddbae'
 OR v_source.frameworks_playback_id IS DISTINCT FROM 'mBdbNNDWgTBDqQfu'
 OR p_reviewer IS NULL OR p_reviewer !~ '^0x[0-9a-f]{40}$' THEN
 RAISE EXCEPTION 'Reviewed recovery evidence differs'; END IF;
 INSERT INTO public.frameworks_import_recoveries(livepeer_asset_id,livepeer_playback_id,source_sha256,source_bytes,original_asset_id,original_playback_id,reason,reviewed_by)
 VALUES(v_source.livepeer_asset_id,v_source.livepeer_playback_id,v_source.source_sha256,v_source.source_bytes,v_source.frameworks_asset_id,v_source.frameworks_playback_id,
 'Creation failed before the protected upload session returned; no media parts were transferred by the importer. Original session is unavailable. Original artifact remains JWT quarantined and retained.',p_reviewer)
 ON CONFLICT(livepeer_asset_id) DO NOTHING;
END;
$$;

CREATE FUNCTION public.adopt_verified_frameworks_recovery(p_source uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_source public.frameworks_asset_imports%ROWTYPE;v_recovery public.frameworks_import_recoveries%ROWTYPE;
BEGIN
 SELECT * INTO v_source FROM public.frameworks_asset_imports WHERE livepeer_asset_id=p_source FOR UPDATE;
 SELECT * INTO STRICT v_recovery FROM public.frameworks_import_recoveries WHERE livepeer_asset_id=p_source FOR UPDATE;
 IF v_source.livepeer_playback_id IS DISTINCT FROM v_recovery.livepeer_playback_id
 OR v_source.source_sha256 IS DISTINCT FROM v_recovery.source_sha256 OR v_source.source_bytes IS DISTINCT FROM v_recovery.source_bytes
 OR v_recovery.state<>'ready' THEN RAISE EXCEPTION 'Recovery source or readiness differs'; END IF;
 IF v_recovery.adopted_at IS NOT NULL THEN
  IF v_source.state='ready' AND v_source.frameworks_asset_id=v_recovery.frameworks_asset_id AND v_source.frameworks_playback_id=v_recovery.frameworks_playback_id THEN RETURN; END IF;
  RAISE EXCEPTION 'Adopted recovery mapping changed';
 END IF;
 IF v_source.state<>'ambiguous' OR v_source.frameworks_asset_id IS DISTINCT FROM v_recovery.original_asset_id
 OR v_source.frameworks_playback_id IS DISTINCT FROM v_recovery.original_playback_id
 OR EXISTS(SELECT 1 FROM public.video_assets WHERE asset_id=v_recovery.original_asset_id OR playback_id=v_recovery.original_playback_id)
 OR EXISTS(SELECT 1 FROM public.frameworks_vod_access WHERE asset_id=v_recovery.original_asset_id OR playback_id=v_recovery.original_playback_id) THEN
 RAISE EXCEPTION 'Original attempt is no longer safely quarantined'; END IF;
 UPDATE public.frameworks_asset_imports SET state='ready',frameworks_asset_id=v_recovery.frameworks_asset_id,
 frameworks_playback_id=v_recovery.frameworks_playback_id,updated_at=now() WHERE livepeer_asset_id=p_source;
 UPDATE public.frameworks_import_recoveries SET adopted_at=now(),updated_at=now() WHERE livepeer_asset_id=p_source;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_reviewed_frameworks_recovery(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.adopt_verified_frameworks_recovery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_reviewed_frameworks_recovery(text),public.adopt_verified_frameworks_recovery(uuid) TO service_role;
