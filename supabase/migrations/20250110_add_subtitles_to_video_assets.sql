-- Add subtitle support to video_assets table
-- Matches the previous OrbisDB implementation for subtitle storage

-- Add subtitles_uri column (for IPFS backup/decentralization)
ALTER TABLE video_assets
ADD COLUMN IF NOT EXISTS subtitles_uri TEXT NULL;

-- Add subtitles JSONB column (for fast access and caching)
ALTER TABLE video_assets
ADD COLUMN IF NOT EXISTS subtitles JSONB NULL;

-- Add comments for documentation
COMMENT ON COLUMN video_assets.subtitles_uri IS 'IPFS URI for decentralized subtitle storage (ipfs://...). Provides immutable backup.';
COMMENT ON COLUMN video_assets.subtitles IS 'Cached subtitle data with translations - JSON format: { "English": [chunks], "Spanish": [chunks], etc. }. Each chunk has {text: string, timestamp: [start, end]}';

-- Create GIN index for JSONB queries (enables searching subtitle content if needed)
CREATE INDEX IF NOT EXISTS idx_video_assets_subtitles ON video_assets USING GIN (subtitles);

-- Create index on subtitles_uri for IPFS lookups
CREATE INDEX IF NOT EXISTS idx_video_assets_subtitles_uri ON video_assets(subtitles_uri) WHERE subtitles_uri IS NOT NULL;

-- Example subtitle structure validation (optional constraint)
-- Ensures the subtitles JSONB follows the correct format
ALTER TABLE video_assets ADD CONSTRAINT valid_subtitles_format 
  CHECK (
    subtitles IS NULL OR (
      jsonb_typeof(subtitles) = 'object'
    )
  );

