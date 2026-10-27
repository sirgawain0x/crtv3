-- Optional public social profile links for creator pages (Orb, Instagram, X).
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS social_orb_url TEXT,
  ADD COLUMN IF NOT EXISTS social_instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS social_x_url TEXT;

COMMENT ON COLUMN public.creator_profiles.social_orb_url IS
  'Canonical https://orb.club/p/… profile URL for creator page link-out';
COMMENT ON COLUMN public.creator_profiles.social_instagram_url IS
  'Canonical https://instagram.com/… profile URL for creator page link-out';
COMMENT ON COLUMN public.creator_profiles.social_x_url IS
  'Canonical https://x.com/… profile URL for creator page link-out';
