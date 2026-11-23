-- Additive only: no existing media IDs, keys, rows or views are rewritten.
ALTER TABLE public.video_assets
  ADD COLUMN IF NOT EXISTS provider text CHECK (provider IN ('livepeer', 'frameworks')),
  ADD COLUMN IF NOT EXISTS livepeer_asset_id text,
  ADD COLUMN IF NOT EXISTS livepeer_playback_id text,
  ADD COLUMN IF NOT EXISTS frameworks_asset_id text,
  ADD COLUMN IF NOT EXISTS frameworks_playback_id text;

ALTER TABLE public.streams
  ADD COLUMN IF NOT EXISTS provider text CHECK (provider IN ('livepeer', 'frameworks')),
  ADD COLUMN IF NOT EXISTS livepeer_stream_id text,
  ADD COLUMN IF NOT EXISTS livepeer_playback_id text,
  ADD COLUMN IF NOT EXISTS frameworks_stream_id text,
  ADD COLUMN IF NOT EXISTS frameworks_playback_id text;

CREATE INDEX IF NOT EXISTS video_assets_livepeer_asset_id_idx
  ON public.video_assets (livepeer_asset_id) WHERE livepeer_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS video_assets_livepeer_playback_id_idx
  ON public.video_assets (livepeer_playback_id) WHERE livepeer_playback_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS streams_livepeer_playback_id_idx
  ON public.streams (livepeer_playback_id) WHERE livepeer_playback_id IS NOT NULL;

-- Reserve before an import mutation. An ambiguous request must be reconciled,
-- never deleted/retried as another import. Store identities, not signed URLs.
CREATE TABLE IF NOT EXISTS public.frameworks_asset_imports (
  livepeer_asset_id uuid PRIMARY KEY,
  livepeer_playback_id text,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_bytes bigint NOT NULL CHECK (source_bytes > 0),
  state text NOT NULL DEFAULT 'prepared'
    CHECK (state IN ('prepared', 'importing', 'processing', 'ready', 'ambiguous', 'failed')),
  frameworks_asset_id text UNIQUE,
  frameworks_playback_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (frameworks_asset_id IS NULL OR length(frameworks_asset_id) BETWEEN 1 AND 200),
  CHECK (frameworks_playback_id IS NULL OR length(frameworks_playback_id) BETWEEN 1 AND 200),
  CHECK (state <> 'ready' OR (frameworks_asset_id IS NOT NULL AND frameworks_playback_id IS NOT NULL))
);

ALTER TABLE public.frameworks_asset_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.frameworks_asset_imports FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.frameworks_asset_imports TO service_role;

COMMENT ON TABLE public.frameworks_asset_imports IS
  'Server-only resumable Studio to FrameWorks import reservations and ID map. Preserve on rollback; never store credentials or source URLs.';

-- No provider switch or data backfill happens here. The reviewed, conditional
-- remap plan is a separate step after imported assets are verified ready.
-- Rollback the app and active IDs first. Retain this ledger and legacy columns
-- until recovery is verified; destructive column/table removal is a later step.
