-- Add MeToken fields to video_assets table
-- This migration adds fields to support MeToken-based content access control

ALTER TABLE video_assets
ADD COLUMN IF NOT EXISTS requires_metoken BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS metoken_price DECIMAL(20, 8) NULL;

-- Add comments for the new fields
COMMENT ON COLUMN video_assets.requires_metoken IS 'Whether this video requires holding the creator''s MeToken for access';
COMMENT ON COLUMN video_assets.metoken_price IS 'Minimum MeToken balance required to access this content (null if not required)';

-- Create an index on requires_metoken for faster queries
CREATE INDEX IF NOT EXISTS idx_video_assets_requires_metoken ON video_assets(requires_metoken) WHERE requires_metoken = TRUE;

-- Create an index on creator_id and requires_metoken for creator-specific queries
CREATE INDEX IF NOT EXISTS idx_video_assets_creator_metoken ON video_assets(creator_id, requires_metoken) WHERE requires_metoken = TRUE;

