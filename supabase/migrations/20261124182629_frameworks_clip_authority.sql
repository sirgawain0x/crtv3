-- Derived clips retain the broadcaster's gate issuer independently of the clip owner.
ALTER TABLE public.frameworks_vod_access
 ADD COLUMN IF NOT EXISTS parent_stream_id uuid REFERENCES public.streams(id),
 ADD COLUMN IF NOT EXISTS gate_creator_id text CHECK (gate_creator_id ~ '^0x[0-9a-f]{40}$');

CREATE OR REPLACE FUNCTION public.register_frameworks_clip(
 p_asset_id text,p_playback_id text,p_owner text,p_parent_stream_id uuid,
 p_parent_playback_id text,p_expected_creator text,p_expected_gate boolean,p_expected_price numeric,
 p_title text,p_start_ms bigint,p_end_ms bigint
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 v_parent public.streams%ROWTYPE;
 v_video_id integer;
BEGIN
 SELECT * INTO v_parent FROM public.streams WHERE id=p_parent_stream_id FOR UPDATE;
 IF NOT FOUND OR v_parent.provider IS DISTINCT FROM 'frameworks'
   OR v_parent.playback_id IS DISTINCT FROM p_parent_playback_id
   OR lower(v_parent.creator_id) IS DISTINCT FROM p_expected_creator
   OR coalesce(v_parent.requires_metoken,false) IS DISTINCT FROM p_expected_gate
   OR v_parent.metoken_price IS DISTINCT FROM p_expected_price
   OR v_parent.allow_clipping IS FALSE THEN
   RAISE EXCEPTION 'Clip parent authorization changed';
 END IF;
 IF p_owner !~ '^0x[0-9a-f]{40}$' OR p_end_ms<=p_start_ms OR p_end_ms-p_start_ms>120000 THEN
   RAISE EXCEPTION 'Invalid clip evidence';
 END IF;
 -- No upsert: an existing client metadata row cannot claim a new protected clip.
 INSERT INTO public.frameworks_vod_access(asset_id,playback_id,creator_id,status,requires_metoken,metoken_price,parent_stream_id,gate_creator_id)
 VALUES(p_asset_id,p_playback_id,p_owner,'draft',coalesce(v_parent.requires_metoken,false),v_parent.metoken_price,v_parent.id,lower(v_parent.creator_id));
 INSERT INTO public.video_assets(title,asset_id,playback_id,category,location,creator_id,status,duration,
 views_count,likes_count,is_minted,current_supply,thumbnail_url,source_type,parent_playback_id,parent_story_ip_id,
 clip_start_ms,clip_end_ms,clipper_address,requires_metoken,metoken_price,provider,frameworks_asset_id,frameworks_playback_id)
 VALUES(coalesce(nullif(p_title,''),'Stream clip'),p_asset_id,p_playback_id,'clip','',p_owner,'draft',(p_end_ms-p_start_ms)/1000.0,
 0,0,false,0,coalesce(v_parent.thumbnail_url,''),'Clip',v_parent.playback_id,v_parent.story_ip_id,
 p_start_ms,p_end_ms,p_owner,coalesce(v_parent.requires_metoken,false),v_parent.metoken_price,'frameworks',p_asset_id,p_playback_id)
 RETURNING id INTO v_video_id;
 RETURN v_video_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_frameworks_clip(text,text,text,uuid,text,text,boolean,numeric,text,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_frameworks_clip(text,text,text,uuid,text,text,boolean,numeric,text,bigint,bigint) TO service_role;

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
  IF v_access.parent_stream_id IS NOT NULL AND (
      (p_requires_metoken IS NOT NULL AND p_requires_metoken IS DISTINCT FROM v_access.requires_metoken)
      OR (p_price_supplied AND p_metoken_price IS DISTINCT FROM v_access.metoken_price)) THEN
    RAISE EXCEPTION 'Inherited clip playback policy is immutable';
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
