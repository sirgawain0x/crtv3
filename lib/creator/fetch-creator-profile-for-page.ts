import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CREATOR_PROFILE_PUBLIC_SELECT,
  CREATOR_PROFILE_PUBLIC_SELECT_WITHOUT_XMERCH,
  CREATOR_PROFILE_SELECT_LEGACY,
  CREATOR_PROFILE_SELECT_WITH_XMERCH,
} from "@/lib/sdk/supabase/creator-profiles-select";

export {
  CREATOR_PROFILE_SELECT_LEGACY,
  CREATOR_PROFILE_SELECT_WITH_XMERCH,
} from "@/lib/sdk/supabase/creator-profiles-select";

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
    .select(CREATOR_PROFILE_PUBLIC_SELECT)
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
    .select(CREATOR_PROFILE_PUBLIC_SELECT_WITHOUT_XMERCH)
    .eq("owner_address", normalized)
    .single();
}