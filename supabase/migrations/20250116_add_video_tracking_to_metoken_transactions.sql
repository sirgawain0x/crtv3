-- Add video tracking to metoken_transactions table
-- This allows us to track which videos contributed to MeToken purchases

ALTER TABLE metoken_transactions
ADD COLUMN IF NOT EXISTS video_id INTEGER NULL,
ADD COLUMN IF NOT EXISTS playback_id TEXT NULL;

-- Add foreign key constraint to video_assets table
ALTER TABLE metoken_transactions
ADD CONSTRAINT fk_metoken_transactions_video 
  FOREIGN KEY (video_id) 
  REFERENCES video_assets(id) 
  ON DELETE SET NULL;

-- Add index for faster queries by video
CREATE INDEX IF NOT EXISTS idx_metoken_transactions_video_id 
  ON metoken_transactions(video_id) 
  WHERE video_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_metoken_transactions_playback_id 
  ON metoken_transactions(playback_id) 
  WHERE playback_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN metoken_transactions.video_id IS 'Reference to the video that triggered this MeToken purchase. Links transactions to specific videos for contribution tracking.';
COMMENT ON COLUMN metoken_transactions.playback_id IS 'Playback ID of the video that triggered this MeToken purchase. Alternative identifier for video tracking.';
