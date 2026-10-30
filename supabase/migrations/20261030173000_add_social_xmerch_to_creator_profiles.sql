-- Invite-only Creative Merch profile data (admin-set; not creator self-serve).
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS social_xmerch JSONB;

COMMENT ON COLUMN public.creator_profiles.social_xmerch IS
  'Admin-set Creative Merch JSON: {"enabled":true,"storeUrl":"https://….xmerch.app","featuredProductUrls":["https://….xmerch.app/products/…"]}';
