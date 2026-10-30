export const MAX_XMERCH_FEATURED_PRODUCTS = 6;

export type CreatorXmerchProfile = {
  enabled: boolean;
  storeUrl: string | null;
  featuredProductUrls: string[];
};

export type SocialProfileNormalizeResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

const EMPTY_XMERCH: CreatorXmerchProfile = {
  enabled: false,
  storeUrl: null,
  featuredProductUrls: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedXmerchHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "xmerch.app") {
    return true;
  }
  if (!host.endsWith(".xmerch.app")) {
    return false;
  }
  const prefix = host.slice(0, -".xmerch.app".length);
  return prefix.length > 0 && !prefix.includes("..");
}

export function normalizeXmerchStoreUrl(
  input: string,
): SocialProfileNormalizeResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: true, url: null };
  }

  let candidate = raw;
  if (!/^https?:\/\//i.test(raw)) {
    if (raw.includes("/")) {
      candidate = `https://${raw}`;
    } else if (/^[\w.-]+\.xmerch\.app$/i.test(raw) || /^xmerch\.app$/i.test(raw)) {
      candidate = `https://${raw}`;
    } else {
      return {
        ok: false,
        error: "Enter an xMerch store URL (https://yourstore.xmerch.app)",
      };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "Enter a valid xMerch store URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "xMerch store URL must use HTTPS" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "Enter a valid xMerch store URL" };
  }

  if (!isAllowedXmerchHostname(parsed.hostname)) {
    return {
      ok: false,
      error: "Store URL must be on xmerch.app (e.g. https://creative.xmerch.app)",
    };
  }

  let path = parsed.pathname;
  if (path !== "/" && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  const normalized = path === "/" ? parsed.origin : `${parsed.origin}${path}`;

  return { ok: true, url: normalized };
}

function normalizeFeaturedProductUrl(input: string): SocialProfileNormalizeResult {
  const result = normalizeXmerchStoreUrl(input);
  if (!result.ok || !result.url) {
    return result;
  }
  const parsed = new URL(result.url);
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") {
    return {
      ok: false,
      error: "Use a product page URL (with a path), not the store homepage",
    };
  }
  return result;
}

export type XmerchProfileValidationResult =
  | { ok: true; value: CreatorXmerchProfile }
  | { ok: false; errors: Record<string, string> };

export function validateAndNormalizeXmerchProfileInput(
  input: unknown,
): XmerchProfileValidationResult {
  if (input === undefined) {
    return { ok: true, value: EMPTY_XMERCH };
  }
  if (input === null) {
    return { ok: true, value: EMPTY_XMERCH };
  }
  if (!isRecord(input)) {
    return { ok: false, errors: { social_xmerch: "Must be an object" } };
  }

  const errors: Record<string, string> = {};
  let enabled = false;

  if ("enabled" in input) {
    if (typeof input.enabled !== "boolean") {
      errors.social_xmerch_enabled = "Enabled must be true or false";
    } else {
      enabled = input.enabled;
    }
  }

  let storeUrl: string | null = null;

  if ("storeUrl" in input) {
    const rawStore = input.storeUrl;
    if (rawStore === null || rawStore === "") {
      storeUrl = null;
    } else if (typeof rawStore !== "string") {
      errors.social_xmerch_store = "Store URL must be text";
    } else {
      const normalized = normalizeXmerchStoreUrl(rawStore);
      if (!normalized.ok) {
        errors.social_xmerch_store = normalized.error;
      } else {
        storeUrl = normalized.url;
      }
    }
  }

  let featuredProductUrls: string[] = [];
  if ("featuredProductUrls" in input) {
    const rawFeatured = input.featuredProductUrls;
    if (rawFeatured === null || rawFeatured === undefined) {
      featuredProductUrls = [];
    } else if (!Array.isArray(rawFeatured)) {
      errors.social_xmerch_featured = "Featured products must be a list";
    } else {
      if (rawFeatured.length > MAX_XMERCH_FEATURED_PRODUCTS) {
        errors.social_xmerch_featured = `Add at most ${MAX_XMERCH_FEATURED_PRODUCTS} featured products`;
      } else {
        const seen = new Set<string>();
        for (let i = 0; i < rawFeatured.length; i += 1) {
          const entry = rawFeatured[i];
          if (typeof entry !== "string") {
            errors[`social_xmerch_featured_${i}`] = "Each featured URL must be text";
            continue;
          }
          const normalized = normalizeFeaturedProductUrl(entry);
          if (!normalized.ok) {
            errors[`social_xmerch_featured_${i}`] = normalized.error;
            continue;
          }
          if (normalized.url && seen.has(normalized.url)) {
            errors[`social_xmerch_featured_${i}`] = "Duplicate product URL";
            continue;
          }
          if (normalized.url) {
            seen.add(normalized.url);
            featuredProductUrls.push(normalized.url);
          }
        }
      }
    }
  }

  if (enabled && !storeUrl && featuredProductUrls.length === 0) {
    errors.social_xmerch =
      "When enabled, provide a store URL and/or at least one featured product URL";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { enabled, storeUrl, featuredProductUrls },
  };
}

function partialSanitize(stored: Record<string, unknown>): CreatorXmerchProfile {
  const enabled = stored.enabled === true;
  const partial: CreatorXmerchProfile = {
    enabled,
    storeUrl: null,
    featuredProductUrls: [],
  };
  if (typeof stored.storeUrl === "string") {
    const store = normalizeXmerchStoreUrl(stored.storeUrl);
    if (store.ok) {
      partial.storeUrl = store.url;
    }
  }
  if (Array.isArray(stored.featuredProductUrls)) {
    for (const entry of stored.featuredProductUrls) {
      if (typeof entry !== "string") {
        continue;
      }
      const product = normalizeFeaturedProductUrl(entry);
      if (
        product.ok &&
        product.url &&
        partial.featuredProductUrls.length < MAX_XMERCH_FEATURED_PRODUCTS
      ) {
        if (!partial.featuredProductUrls.includes(product.url)) {
          partial.featuredProductUrls.push(product.url);
        }
      }
    }
  }
  return partial;
}

/** Re-validates DB JSON before render (drops invalid entries). */
export function sanitizeStoredXmerchProfile(
  stored: unknown,
): CreatorXmerchProfile {
  if (stored == null) {
    return EMPTY_XMERCH;
  }

  if (typeof stored === "string") {
    try {
      return sanitizeStoredXmerchProfile(JSON.parse(stored));
    } catch {
      const legacyStore = normalizeXmerchStoreUrl(stored);
      if (legacyStore.ok && legacyStore.url) {
        return {
          enabled: true,
          storeUrl: legacyStore.url,
          featuredProductUrls: [],
        };
      }
      return EMPTY_XMERCH;
    }
  }

  if (!isRecord(stored)) {
    return EMPTY_XMERCH;
  }

  const validated = validateAndNormalizeXmerchProfileInput(stored);
  if (!validated.ok) {
    return partialSanitize(stored);
  }

  return validated.value;
}

/** Public creator pages: invite-only xMerch when admin enabled flag is set. */
export function getPublicXmerchProfile(stored: unknown): CreatorXmerchProfile | null {
  const profile = sanitizeStoredXmerchProfile(stored);
  if (!profile.enabled) {
    return null;
  }
  if (!profile.storeUrl && profile.featuredProductUrls.length === 0) {
    return null;
  }
  return profile;
}

export function featuredProductLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1];
    if (slug) {
      return decodeURIComponent(slug).replace(/[-_]+/g, " ");
    }
  } catch {
    // fall through
  }
  return "Product";
}
