-- Brand Pass holders can link their creator profile to a brand channel page.
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS brand_channel_slug TEXT;

COMMENT ON COLUMN public.creator_profiles.brand_channel_slug IS
  'Slug of linked brand channel (chones, spindrift, songchain). Brand Pass required to set.';

-- Chones: seed link for Hack Beta admin / Brand Pass holder (0x6ab…c5ad).
UPDATE public.creator_profiles
SET brand_channel_slug = 'chones',
    updated_at = NOW()
WHERE owner_address = '0x6aba01c84b8b962d197e8a62598fea3cfe0c5ad'
  AND (brand_channel_slug IS NULL OR brand_channel_slug = '');
