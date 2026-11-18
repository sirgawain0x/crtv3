-- #1 creator_profiles: column-level SELECT lock
-- DO NOT APPLY until PR #447 is merged and deployed to production.
-- Until then, anon/authenticated select('*') on public.creator_profiles still works; after this
-- migration, only the columns in the GRANT below are readable via PostgREST for those roles.

REVOKE SELECT ON TABLE public.creator_profiles FROM anon, authenticated;
GRANT SELECT (id, owner_address, username, bio, avatar_url, twin_enabled, twin_address, twin_avatar_glb_url, twin_chat_endpoint, twin_pinata_agent_id, twin_pinata_snapshot_cid, twin_pinata_agent_name, twin_pinata_connected_at, orb_account_id, lens_account_id, lens_handle, lens_avatar_uri, brand_channel_slug, social_orb_url, social_instagram_url, social_x_url, social_xmerch, created_at, updated_at) ON TABLE public.creator_profiles TO anon, authenticated;
