-- Playback authority is separate from legacy client-supplied video metadata.
-- New uploads are registered only after wallet verification and provider-confirmed JWT policy.
CREATE TABLE IF NOT EXISTS public.frameworks_vod_access (
  asset_id text PRIMARY KEY CHECK (asset_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$'),
  playback_id text UNIQUE NOT NULL CHECK (playback_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$'),
  creator_id text NOT NULL CHECK (creator_id ~ '^0x[0-9a-f]{40}$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','minted','archived')),
  requires_metoken boolean NOT NULL DEFAULT false,
  metoken_price numeric CHECK (metoken_price IS NULL OR metoken_price >= 0 AND metoken_price <> 'NaN'::numeric),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.frameworks_vod_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.frameworks_vod_access FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.frameworks_vod_access TO service_role;

-- A verified server caller supplies p_owner. Both tables are locked and changed together.
-- Invoker permissions + explicit EXECUTE grants keep this off the anonymous Data API.
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
COMMENT ON TABLE public.frameworks_vod_access IS
  'Server-only playback authorization. Legacy video metadata alone never authorizes FrameWorks VOD tokens. Preserve on rollback.';
