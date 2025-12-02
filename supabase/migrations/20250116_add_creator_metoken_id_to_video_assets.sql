-- Add creator_metoken_id to video_assets table
-- This migration adds a direct foreign key link between videos and the creator's MeToken

ALTER TABLE video_assets
ADD COLUMN IF NOT EXISTS creator_metoken_id UUID NULL;

-- Add foreign key constraint to metokens table
ALTER TABLE video_assets
ADD CONSTRAINT fk_video_assets_creator_metoken 
  FOREIGN KEY (creator_metoken_id) 
  REFERENCES metokens(id) 
  ON DELETE SET NULL;

-- Add index for faster queries by creator MeToken
CREATE INDEX IF NOT EXISTS idx_video_assets_creator_metoken_id 
  ON video_assets(creator_metoken_id) 
  WHERE creator_metoken_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN video_assets.creator_metoken_id IS 'Direct reference to the creator''s MeToken. Links each video to its creator''s MeToken for access control and creator monetization.';
