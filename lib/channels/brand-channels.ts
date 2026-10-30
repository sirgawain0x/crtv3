/**
 * Registry of Creative TV brand channels that Brand Pass holders can link from
 * their creator profile. Channel pages live under `/{slug}` (e.g. /chones).
 *
 * Spindrift and Songchain are listed here for validation/UI but are intentionally
 * not pre-attached to any profile — see docs/brand-channel-profile-link.md.
 */
export type BrandChannelSlug = "chones" | "spindrift" | "songchain";

export type BrandChannelDefinition = {
  slug: BrandChannelSlug;
  /** Display name shown in owner picker */
  name: string;
  /** Root path for the brand channel page */
  path: string;
};

export const BRAND_CHANNELS: readonly BrandChannelDefinition[] = [
  { slug: "chones", name: "Chones", path: "/chones" },
  { slug: "spindrift", name: "Spindrift", path: "/spindrift" },
  { slug: "songchain", name: "Songchain", path: "/songchain" },
] as const;

const SLUG_SET = new Set<string>(BRAND_CHANNELS.map((c) => c.slug));

/** Chones Hack Beta admin wallet (Brand Pass holder). */
export const CHONES_CHANNEL_OWNER_ADDRESS =
  "0x6aBAa01C84b8b962D197E8a62598fea3Cfe0c5AD";

export function isValidBrandChannelSlug(
  slug: string | null | undefined
): slug is BrandChannelSlug {
  if (!slug) return false;
  return SLUG_SET.has(slug);
}

export function getBrandChannelBySlug(
  slug: string | null | undefined
): BrandChannelDefinition | null {
  if (!isValidBrandChannelSlug(slug)) return null;
  return BRAND_CHANNELS.find((c) => c.slug === slug) ?? null;
}

export function getBrandChannelPath(
  slug: string | null | undefined
): string | null {
  return getBrandChannelBySlug(slug)?.path ?? null;
}
