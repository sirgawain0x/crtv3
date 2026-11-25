-- Additive: persist sanitized provider failure context and reset failed imports for checksum-verified retry.
ALTER TABLE public.frameworks_asset_imports
  ADD COLUMN IF NOT EXISTS provider_failure_phase text,
  ADD COLUMN IF NOT EXISTS provider_failure_reason text
    CHECK (provider_failure_reason IS NULL OR (length(provider_failure_reason) BETWEEN 1 AND 500 AND provider_failure_reason !~* 'https?://')),
  ADD COLUMN IF NOT EXISTS provider_failure_recorded_at timestamptz;

COMMENT ON COLUMN public.frameworks_asset_imports.provider_failure_reason IS
  'Sanitized FrameWorks processing failure summary. Raw provider bodies and signed URLs are never stored.';

CREATE FUNCTION public.reset_frameworks_failed_import(
  p_source uuid,
  p_playback text,
  p_sha256 text,
  p_bytes bigint
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_row public.frameworks_asset_imports%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.frameworks_asset_imports WHERE livepeer_asset_id = p_source FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import reservation not found';
  END IF;
  IF v_row.state = 'ready' THEN
    RAISE EXCEPTION 'Ready imports cannot be reset';
  END IF;
  IF v_row.livepeer_playback_id IS DISTINCT FROM p_playback
    OR v_row.source_sha256 IS DISTINCT FROM p_sha256
    OR v_row.source_bytes IS DISTINCT FROM p_bytes THEN
    RAISE EXCEPTION 'Source evidence differs';
  END IF;
  IF v_row.state = 'prepared'
    AND v_row.frameworks_asset_id IS NULL
    AND v_row.frameworks_playback_id IS NULL THEN
    RETURN;
  END IF;
  IF v_row.state <> 'failed' THEN
    RAISE EXCEPTION 'Only failed imports can be reset for retry';
  END IF;
  UPDATE public.frameworks_asset_imports
    SET state = 'prepared',
        frameworks_asset_id = NULL,
        frameworks_playback_id = NULL,
        updated_at = now()
    WHERE livepeer_asset_id = p_source;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_frameworks_failed_import(uuid, text, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_frameworks_failed_import(uuid, text, text, bigint) TO service_role;