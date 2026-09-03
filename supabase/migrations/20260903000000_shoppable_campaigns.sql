-- Shoppable video overlays: campaigns, product kits, videos, temporal annotations.
-- Access model: public SELECT for active in-window campaigns; writes via service-role API routes.

DO $$ BEGIN
  CREATE TYPE public.shoppable_campaign_status AS ENUM (
    'pending',
    'active',
    'rejected',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.shoppable_detection_status AS ENUM (
    'idle',
    'queued',
    'processing',
    'ready',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.shoppable_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_proposal_id text UNIQUE,
  brand_address text NOT NULL,
  creator_address text NOT NULL,
  status public.shoppable_campaign_status NOT NULL DEFAULT 'pending',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  budget_usdc numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shoppable_campaigns_brand_lower CHECK (brand_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT shoppable_campaigns_creator_lower CHECK (creator_address ~ '^0x[a-f0-9]{40}$'),
  CONSTRAINT shoppable_campaigns_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_shoppable_campaigns_snapshot
  ON public.shoppable_campaigns (snapshot_proposal_id);

CREATE INDEX IF NOT EXISTS idx_shoppable_campaigns_creator
  ON public.shoppable_campaigns (creator_address);

CREATE INDEX IF NOT EXISTS idx_shoppable_campaigns_brand
  ON public.shoppable_campaigns (brand_address);

CREATE INDEX IF NOT EXISTS idx_shoppable_campaigns_status
  ON public.shoppable_campaigns (status);

CREATE TABLE IF NOT EXISTS public.shoppable_product_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE
    REFERENCES public.shoppable_campaigns(id) ON DELETE CASCADE,
  ipfs_hash text NOT NULL,
  brand_name text NOT NULL,
  brand_handle text NOT NULL,
  brand_logo_url text NOT NULL,
  product_image_url text NOT NULL,
  purchase_url text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shoppable_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE
    REFERENCES public.shoppable_campaigns(id) ON DELETE CASCADE,
  livepeer_asset_id text NOT NULL,
  livepeer_playback_id text NOT NULL,
  video_asset_id integer REFERENCES public.video_assets(id) ON DELETE SET NULL,
  duration double precision,
  detection_status public.shoppable_detection_status NOT NULL DEFAULT 'idle',
  detection_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shoppable_videos_livepeer_asset_unique UNIQUE (livepeer_asset_id),
  CONSTRAINT shoppable_videos_livepeer_playback_unique UNIQUE (livepeer_playback_id)
);

CREATE INDEX IF NOT EXISTS idx_shoppable_videos_playback
  ON public.shoppable_videos (livepeer_playback_id);

CREATE INDEX IF NOT EXISTS idx_shoppable_videos_detection
  ON public.shoppable_videos (detection_status);

CREATE TABLE IF NOT EXISTS public.shoppable_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL
    REFERENCES public.shoppable_videos(id) ON DELETE CASCADE,
  product_kit_id uuid NOT NULL
    REFERENCES public.shoppable_product_kits(id) ON DELETE CASCADE,
  start_time double precision NOT NULL,
  end_time double precision NOT NULL,
  bounding_box integer[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shoppable_annotations_times CHECK (end_time >= start_time),
  CONSTRAINT shoppable_annotations_bbox_len CHECK (cardinality(bounding_box) = 4)
);

CREATE INDEX IF NOT EXISTS idx_shoppable_annotations_video
  ON public.shoppable_annotations (video_id, start_time);

COMMENT ON TABLE public.shoppable_campaigns IS 'Brand shoppable overlay campaigns linked to Snapshot proposals';
COMMENT ON TABLE public.shoppable_product_kits IS 'Grove-backed product kit metadata for a campaign';
COMMENT ON TABLE public.shoppable_videos IS 'Creator Livepeer VOD linked to a shoppable campaign';
COMMENT ON TABLE public.shoppable_annotations IS 'Gemini temporal product detections [ymin,xmin,ymax,xmax] on 0-1000 grid';

CREATE OR REPLACE FUNCTION public.set_shoppable_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shoppable_campaigns_updated_at ON public.shoppable_campaigns;
CREATE TRIGGER shoppable_campaigns_updated_at
  BEFORE UPDATE ON public.shoppable_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_shoppable_updated_at();

DROP TRIGGER IF EXISTS shoppable_videos_updated_at ON public.shoppable_videos;
CREATE TRIGGER shoppable_videos_updated_at
  BEFORE UPDATE ON public.shoppable_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_shoppable_updated_at();

ALTER TABLE public.shoppable_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoppable_product_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoppable_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoppable_annotations ENABLE ROW LEVEL SECURITY;

-- Public SELECT only for active campaigns within their date window.
DROP POLICY IF EXISTS shoppable_campaigns_select_active ON public.shoppable_campaigns;
CREATE POLICY shoppable_campaigns_select_active
  ON public.shoppable_campaigns
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND start_date <= now()
    AND end_date >= now()
  );

DROP POLICY IF EXISTS shoppable_product_kits_select_active ON public.shoppable_product_kits;
CREATE POLICY shoppable_product_kits_select_active
  ON public.shoppable_product_kits
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shoppable_campaigns c
      WHERE c.id = campaign_id
        AND c.status = 'active'
        AND c.start_date <= now()
        AND c.end_date >= now()
    )
  );

DROP POLICY IF EXISTS shoppable_videos_select_active ON public.shoppable_videos;
CREATE POLICY shoppable_videos_select_active
  ON public.shoppable_videos
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shoppable_campaigns c
      WHERE c.id = campaign_id
        AND c.status = 'active'
        AND c.start_date <= now()
        AND c.end_date >= now()
    )
  );

DROP POLICY IF EXISTS shoppable_annotations_select_active ON public.shoppable_annotations;
CREATE POLICY shoppable_annotations_select_active
  ON public.shoppable_annotations
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shoppable_videos v
      JOIN public.shoppable_campaigns c ON c.id = v.campaign_id
      WHERE v.id = video_id
        AND c.status = 'active'
        AND c.start_date <= now()
        AND c.end_date >= now()
    )
  );

GRANT SELECT ON public.shoppable_campaigns TO anon, authenticated;
GRANT SELECT ON public.shoppable_product_kits TO anon, authenticated;
GRANT SELECT ON public.shoppable_videos TO anon, authenticated;
GRANT SELECT ON public.shoppable_annotations TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.shoppable_campaigns FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.shoppable_product_kits FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.shoppable_videos FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.shoppable_annotations FROM anon, authenticated;
