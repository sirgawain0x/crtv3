import { normalizeXmerchStoreUrl } from "@/lib/creator/social-profile-urls";

export const MAX_XMERCH_FEATURED_PRODUCTS = 6;

export type CreatorXmerchProfile = {
  storeUrl: string | null;
  featuredProductUrls: string[];
};

const EMPTY_XMERCH: CreatorXmerchProfile = {
  storeUrl: null,
  featuredProductUrls: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFeaturedProductUrl(input: string): ReturnType<typeof normalizeXmerchStoreUrl> {
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

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { storeUrl, featuredProductUrls },
  };
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
        return { storeUrl: legacyStore.url, featuredProductUrls: [] };
      }
      return EMPTY_XMERCH;
    }
  }

  if (!isRecord(stored)) {
    return EMPTY_XMERCH;
  }

  const validated = validateAndNormalizeXmerchProfileInput(stored);
  if (!validated.ok) {
    const partial: CreatorXmerchProfile = { storeUrl: null, featuredProductUrls: [] };
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

  return validated.value;
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
