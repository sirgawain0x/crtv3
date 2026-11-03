import type { SupabaseClient } from "@supabase/supabase-js";

export const CREATOR_PROFILE_SELECT_WITH_XMERCH =
  "id, owner_address, username, bio, avatar_url, brand_channel_slug, social_orb_url, social_instagram_url, social_x_url, social_xmerch, created_at, updated_at";

export const CREATOR_PROFILE_SELECT_LEGACY =
  "id, owner_address, username, bio, avatar_url, brand_channel_slug, social_orb_url, social_instagram_url, social_x_url, created_at, updated_at";

export function isSocialXmerchColumnMissingError(error: {
  message?: string;
  code?: string;
}): boolean {
  const message = (error.message ?? "").toLowerCase();
  if (!message.includes("social_xmerch")) {
    return false;
  }
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

export async function fetchCreatorProfileForPage(
  supabase: SupabaseClient,
  ownerAddress: string,
) {
  const normalized = ownerAddress.toLowerCase();
  const withXmerch = await supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_SELECT_WITH_XMERCH)
    .eq("owner_address", normalized)
    .single();

  if (!withXmerch.error) {
    return withXmerch;
  }

  if (withXmerch.error.code === "PGRST116") {
    return withXmerch;
  }

  if (!isSocialXmerchColumnMissingError(withXmerch.error)) {
    return withXmerch;
  }

  return supabase
    .from("creator_profiles")
    .select(CREATOR_PROFILE_SELECT_LEGACY)
    .eq("owner_address", normalized)
    .single();
}
