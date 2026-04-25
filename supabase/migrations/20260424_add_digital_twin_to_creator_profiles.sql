-- Digital Twin fields on creator_profiles.
-- Lets a creator declare an externally-deployed Creative AI Digital Twin that
-- the live/watch pages render as a corner overlay (3D avatar) or chat panel.

alter table public.creator_profiles
  add column if not exists twin_enabled boolean default false,
  add column if not exists twin_address text,
  add column if not exists twin_avatar_glb_url text,
  add column if not exists twin_chat_endpoint text;

-- Index used by the moderators dialog to look up "is this address someone's twin?".
create index if not exists creator_profiles_twin_address_idx
  on public.creator_profiles (twin_address)
  where twin_address is not null;
