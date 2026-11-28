-- Hosted video_assets.thumbnail_url is NOT NULL; a stream without a thumbnail still records safely.
CREATE OR REPLACE FUNCTION public.process_frameworks_webhook(
  p_event_id text, p_type text, p_sha256 text, p_occurred_at timestamptz,
  p_stream_id text, p_artifact jsonb
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_inserted integer;
  v_receipt public.frameworks_webhook_receipts%ROWTYPE;
  v_stream public.streams%ROWTYPE;
  v_existing public.video_assets%ROWTYPE;
  v_cursor public.frameworks_stream_event_cursors%ROWTYPE;
  v_asset_id text;
  v_playback_id text;
  v_duration numeric;
BEGIN
  IF p_type NOT IN ('stream.live','stream.idle','recording.ready','upload.ready','clip.ready')
      OR p_occurred_at IS NULL THEN RAISE EXCEPTION 'Invalid business event'; END IF;
  INSERT INTO public.frameworks_webhook_receipts(event_id,payload_sha256,event_type,occurred_at)
    VALUES(p_event_id,p_sha256,p_type,p_occurred_at) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT;
  IF v_inserted=0 THEN
    SELECT * INTO v_receipt FROM public.frameworks_webhook_receipts WHERE event_id=p_event_id;
    IF v_receipt.payload_sha256 IS DISTINCT FROM p_sha256 OR v_receipt.event_type IS DISTINCT FROM p_type THEN
      RAISE EXCEPTION 'Webhook event identity conflict';
    END IF;
    RETURN 'duplicate';
  END IF;
  IF p_type IN ('stream.live','stream.idle') THEN
    SELECT * INTO v_stream FROM public.streams WHERE stream_id=p_stream_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stream not available yet'; END IF;
    SELECT * INTO v_cursor FROM public.frameworks_stream_event_cursors WHERE stream_id=p_stream_id;
    IF FOUND AND v_cursor.occurred_at >= p_occurred_at THEN RETURN 'ignored'; END IF;
    INSERT INTO public.frameworks_stream_event_cursors(stream_id,occurred_at,event_id)
      VALUES(p_stream_id,p_occurred_at,p_event_id)
      ON CONFLICT(stream_id) DO UPDATE SET occurred_at=excluded.occurred_at,event_id=excluded.event_id;
    UPDATE public.streams SET is_live=(p_type='stream.live'),
      last_live_at=CASE WHEN p_type='stream.live' THEN p_occurred_at ELSE last_live_at END,
      updated_at=now() WHERE id=v_stream.id;
    RETURN 'processed';
  END IF;
  v_asset_id=p_artifact->>'assetId';
  v_playback_id=p_artifact->>'playbackId';
  v_duration=(p_artifact->>'durationSeconds')::numeric;
  IF v_asset_id IS NULL OR v_playback_id IS NULL THEN RAISE EXCEPTION 'Missing ready artifact identity'; END IF;
  IF p_type='recording.ready' THEN
    SELECT * INTO v_stream FROM public.streams WHERE stream_id=p_stream_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Recording parent stream not available yet'; END IF;
    IF v_stream.save_recording=false THEN RETURN 'ignored'; END IF;
  END IF;
  -- The artifact PK serializes different ready events for the same source until this transaction commits.
  INSERT INTO public.frameworks_ready_artifacts(asset_id,playback_id,event_type,stream_id,duration_seconds)
    VALUES(v_asset_id,v_playback_id,p_type,p_stream_id,v_duration)
    ON CONFLICT(asset_id) DO UPDATE SET observed_at=now(),duration_seconds=coalesce(excluded.duration_seconds,public.frameworks_ready_artifacts.duration_seconds)
    WHERE public.frameworks_ready_artifacts.playback_id=excluded.playback_id;
  GET DIAGNOSTICS v_inserted=ROW_COUNT;
  IF v_inserted=0 THEN RAISE EXCEPTION 'Conflicting artifact playback identity'; END IF;
  IF p_type='recording.ready' THEN
    SELECT * INTO v_existing FROM public.video_assets WHERE asset_id=v_asset_id LIMIT 1;
    IF FOUND THEN
      IF v_existing.playback_id IS DISTINCT FROM v_playback_id OR lower(v_existing.creator_id) IS DISTINCT FROM lower(v_stream.creator_id) THEN
        RAISE EXCEPTION 'Recording ownership or identity conflict';
      END IF;
    ELSE
      INSERT INTO public.video_assets(title,asset_id,playback_id,category,location,description,creator_id,status,
        duration,views_count,likes_count,is_minted,current_supply,thumbnail_url,source_type,parent_playback_id,requires_metoken,metoken_price)
      VALUES(coalesce(nullif(p_artifact->>'name',''),v_stream.name,'Livestream recording'),v_asset_id,v_playback_id,
        'livestream','',NULL,lower(v_stream.creator_id),'published',v_duration,0,0,false,0,coalesce(v_stream.thumbnail_url,''),
        'Livestream',v_stream.playback_id,v_stream.requires_metoken,v_stream.metoken_price);
    END IF;
  ELSE
    -- Ready observations are durable even if the browser has not saved its draft yet. Never publish or assign an owner from webhook metadata.
    UPDATE public.video_assets SET duration=coalesce(v_duration,duration),updated_at=now()
      WHERE asset_id=v_asset_id AND playback_id=v_playback_id;
  END IF;
  RETURN 'processed';
END;
$$;
REVOKE ALL ON FUNCTION public.process_frameworks_webhook(text,text,text,timestamptz,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_frameworks_webhook(text,text,text,timestamptz,text,jsonb) TO service_role;
