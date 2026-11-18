import type { CreatorProfile } from "./client";

/**
 * Explicit PostgREST column lists for `creator_profiles`.
 *
 * Public lists omit `twin_pinata_gateway_token`, `twin_pinata_base_url`, and
 * `twin_pinata_ws_url` so anon/authenticated clients never receive Pinata
 * routing secrets (column revoke ships separately).
 */

/** Column names derived from supabase/migrations (creator_profiles + alters). */
export const CREATOR_PROFILE_PUBLIC_COLUMNS = [
  "id",
  "owner_address",
  "username",
  "bio",
  "avatar_url",
  "twin_enabled",
  "twin_address",
  "twin_avatar_glb_url",
  "twin_chat_endpoint",
  "twin_pinata_agent_id",
  "twin_pinata_snapshot_cid",
  "twin_pinata_agent_name",
  "twin_pinata_connected_at",
  "orb_account_id",
  "lens_account_id",
  "lens_handle",
  "lens_avatar_uri",
  "brand_channel_slug",
  "social_orb_url",
  "social_instagram_url",
  "social_x_url",
  "social_xmerch",
  "created_at",
  "updated_at",
] as const;

export type CreatorProfilePublicColumn =
  (typeof CREATOR_PROFILE_PUBLIC_COLUMNS)[number];

export const CREATOR_PROFILE_PUBLIC_SELECT =
  CREATOR_PROFILE_PUBLIC_COLUMNS.join(", ");

/** Legacy deployments before `social_xmerch` was added. */
export const CREATOR_PROFILE_PUBLIC_COLUMNS_WITHOUT_XMERCH =
  CREATOR_PROFILE_PUBLIC_COLUMNS.filter((c) => c !== "social_xmerch");

export const CREATOR_PROFILE_PUBLIC_SELECT_WITHOUT_XMERCH =
  CREATOR_PROFILE_PUBLIC_COLUMNS_WITHOUT_XMERCH.join(", ");

/** @deprecated Use CREATOR_PROFILE_PUBLIC_SELECT_WITHOUT_XMERCH */
export const CREATOR_PROFILE_SELECT_LEGACY =
  CREATOR_PROFILE_PUBLIC_SELECT_WITHOUT_XMERCH;

/** @deprecated Use CREATOR_PROFILE_PUBLIC_SELECT */
export const CREATOR_PROFILE_SELECT_WITH_XMERCH = CREATOR_PROFILE_PUBLIC_SELECT;

/** Service-role only: twin chat routing (never exposed to browsers). */
export const CREATOR_PROFILE_TWIN_ROUTING_SELECT =
  "twin_enabled, twin_pinata_base_url, twin_pinata_gateway_token, twin_chat_endpoint";

/** Service-role only: twin connection status checks (gateway token not returned in API). */
export const CREATOR_PROFILE_TWIN_STATUS_SELECT =
  "twin_pinata_agent_id, twin_pinata_agent_name, twin_pinata_snapshot_cid, twin_pinata_connected_at, twin_pinata_gateway_token";

export const CREATOR_PROFILE_FORBIDDEN_PUBLIC_PINATA_COLUMNS = [
  "twin_pinata_gateway_token",
  "twin_pinata_base_url",
  "twin_pinata_ws_url",
] as const;

/** Row shape returned by CREATOR_PROFILE_PUBLIC_SELECT (matches client CreatorProfile). */
export type CreatorProfilePublicRow = CreatorProfile;