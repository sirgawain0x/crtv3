-- Prevent older public viewer tokens from bypassing a stricter gate on the same playback ID.
CREATE OR REPLACE FUNCTION public.update_frameworks_vod_access(
  p_video_id integer, p_owner text, p_status text, p_requires_metoken boolean,
  p_metoken_price numeric, p_price_supplied boolean
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_video public.video_assets%ROWTYPE;
  v_access public.frameworks_vod_access%ROWTYPE;
BEGIN
  SELECT * INTO v_video FROM public.video_assets WHERE id=p_video_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Video unavailable'; END IF;
  SELECT * INTO v_access FROM public.frameworks_vod_access WHERE asset_id=v_video.asset_id FOR UPDATE;
  IF NOT FOUND OR v_access.playback_id IS DISTINCT FROM v_video.playback_id
      OR v_access.creator_id IS DISTINCT FROM p_owner
      OR lower(v_video.creator_id) IS DISTINCT FROM p_owner THEN
    RAISE EXCEPTION 'Video ownership authorization failed';
  END IF;
  -- Public viewer tokens may remain valid until expiry. A published asset's gate is immutable.
  -- Re-uploads use a new playback ID; do not move a published/archived asset back into draft.
  IF v_access.status <> 'draft' AND (
      (p_status IS NOT NULL AND p_status='draft')
      OR (p_requires_metoken IS NOT NULL AND p_requires_metoken IS DISTINCT FROM v_access.requires_metoken)
      OR (p_price_supplied AND p_metoken_price IS DISTINCT FROM v_access.metoken_price)) THEN
    RAISE EXCEPTION 'Published playback policy is immutable; use a new protected upload';
  END IF;
  UPDATE public.frameworks_vod_access SET
    status=coalesce(p_status,v_access.status),
    requires_metoken=coalesce(p_requires_metoken,v_access.requires_metoken),
    metoken_price=CASE WHEN p_price_supplied THEN p_metoken_price ELSE v_access.metoken_price END,
    updated_at=now()
    WHERE asset_id=v_access.asset_id;
  UPDATE public.video_assets SET
    status=coalesce(p_status,v_access.status),
    requires_metoken=coalesce(p_requires_metoken,v_access.requires_metoken),
    metoken_price=CASE WHEN p_price_supplied THEN p_metoken_price ELSE v_access.metoken_price END,
    updated_at=now()
    WHERE id=p_video_id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_frameworks_vod_access(integer,text,text,boolean,numeric,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_frameworks_vod_access(integer,text,text,boolean,numeric,boolean) TO service_role;
