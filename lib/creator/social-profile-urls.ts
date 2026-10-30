export type CreatorSocialPlatform = "orb" | "instagram" | "x";

export type SocialProfileNormalizeResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

const X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

const ORB_HOSTS = new Set(["orb.club", "www.orb.club"]);

function stripAt(handle: string): string {
  return handle.replace(/^@+/, "").trim();
}

/**
 * Parse http(s) URLs only. Plain handles (no slash) return null.
 * Bare host/path inputs get an https:// prefix before parsing.
 */
export function parseHttpSocialUrl(input: string): URL | null {
  const raw = input.trim();
  if (!raw || raw.startsWith("@")) {
    return null;
  }

  let candidate = raw;
  if (!/^https?:\/\//i.test(raw)) {
    if (!raw.includes("/")) {
      return null;
    }
    candidate = `https://${raw}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return parsed;
}

function hostnameIsAllowed(parsed: URL, allowedHosts: ReadonlySet<string>): boolean {
  return allowedHosts.has(parsed.hostname.toLowerCase());
}

function isValidXHandle(handle: string): boolean {
  return /^[A-Za-z0-9_]{1,15}$/.test(handle);
}

function isValidInstagramHandle(handle: string): boolean {
  return /^[A-Za-z0-9._]{1,30}$/.test(handle);
}

function isValidOrbProfileKey(key: string): boolean {
  if (key.includes("..")) {
    return false;
  }
  if (/^0x[0-9a-fA-F]{40}$/.test(key)) {
    return true;
  }
  return /^[\w.-]{1,100}$/.test(key);
}

function safeDecodeUriComponent(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function normalizeOrbProfileUrl(input: string): SocialProfileNormalizeResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: true, url: null };
  }

  const parsed = parseHttpSocialUrl(raw);
  if (parsed) {
    if (!hostnameIsAllowed(parsed, ORB_HOSTS)) {
      return {
        ok: false,
        error: "Enter an Orb profile URL (orb.club/p/…) or handle",
      };
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] !== "p" || !segments[1]) {
      return {
        ok: false,
        error:
          "Use an Orb profile link (orb.club/p/your-handle), not a club or invalid path",
      };
    }
    const profileKey = safeDecodeUriComponent(segments[1]);
    if (profileKey === null || !isValidOrbProfileKey(profileKey)) {
      return { ok: false, error: "Enter a valid Orb profile handle or address" };
    }
    const normalizedKey = profileKey.startsWith("0x")
      ? profileKey.toLowerCase()
      : profileKey;
    return {
      ok: true,
      url: `https://orb.club/p/${encodeURIComponent(normalizedKey)}`,
    };
  }

  const key = stripAt(raw);
  if (!isValidOrbProfileKey(key)) {
    return {
      ok: false,
      error: "Enter a valid Orb handle, wallet address, or profile URL",
    };
  }
  const normalizedKey = key.startsWith("0x") ? key.toLowerCase() : key;
  return {
    ok: true,
    url: `https://orb.club/p/${encodeURIComponent(normalizedKey)}`,
  };
}

export function normalizeInstagramProfileUrl(
  input: string,
): SocialProfileNormalizeResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: true, url: null };
  }

  const parsed = parseHttpSocialUrl(raw);
  if (parsed) {
    if (!hostnameIsAllowed(parsed, INSTAGRAM_HOSTS)) {
      return {
        ok: false,
        error: "Enter an Instagram profile URL or @handle",
      };
    }
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    const pathName = stripAt(handle ?? "").toLowerCase();
    if (
      !pathName ||
      ["p", "reel", "reels", "stories", "explore"].includes(pathName)
    ) {
      return { ok: false, error: "Enter a valid Instagram profile handle" };
    }
    const cleaned = stripAt(handle);
    if (!isValidInstagramHandle(cleaned)) {
      return { ok: false, error: "Enter a valid Instagram profile handle" };
    }
    return { ok: true, url: `https://instagram.com/${cleaned}` };
  }

  const handle = stripAt(raw);
  if (!isValidInstagramHandle(handle)) {
    return {
      ok: false,
      error:
        "Instagram handles use letters, numbers, periods, and underscores (1–30 characters)",
    };
  }
  return { ok: true, url: `https://instagram.com/${handle}` };
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

export function normalizeXProfileUrl(input: string): SocialProfileNormalizeResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: true, url: null };
  }

  const parsed = parseHttpSocialUrl(raw);
  if (parsed) {
    if (!hostnameIsAllowed(parsed, X_HOSTS)) {
      return { ok: false, error: "Enter an X profile URL or @handle" };
    }
    const segment = parsed.pathname.split("/").filter(Boolean)[0];
    const pathName = stripAt(segment ?? "").toLowerCase();
    if (
      !pathName ||
      ["home", "intent", "share", "i", "hashtag", "search"].includes(pathName)
    ) {
      return { ok: false, error: "Enter a valid X profile handle" };
    }
    const handle = stripAt(segment);
    if (!isValidXHandle(handle)) {
      return { ok: false, error: "Enter a valid X profile handle" };
    }
    return { ok: true, url: `https://x.com/${handle}` };
  }

  const handle = stripAt(raw);
  if (!isValidXHandle(handle)) {
    return {
      ok: false,
      error: "X handles use letters, numbers, and underscores (1–15 characters)",
    };
  }
  return { ok: true, url: `https://x.com/${handle}` };
}

/** Re-validates a stored DB URL before rendering or trusting client-side. */
export function sanitizeStoredSocialUrl(
  platform: CreatorSocialPlatform,
  stored: string | null | undefined,
): string | null {
  if (stored == null || stored.trim() === "") {
    return null;
  }
  const result = normalizeCreatorSocialProfileUrl(platform, stored);
  if (!result.ok || !result.url) {
    return null;
  }
  return result.url;
}

export function normalizeCreatorSocialProfileUrl(
  platform: CreatorSocialPlatform,
  input: string,
): SocialProfileNormalizeResult {
  switch (platform) {
    case "orb":
      return normalizeOrbProfileUrl(input);
    case "instagram":
      return normalizeInstagramProfileUrl(input);
    case "x":
      return normalizeXProfileUrl(input);
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}

export const CREATOR_SOCIAL_URL_FIELDS = {
  orb: "social_orb_url",
  instagram: "social_instagram_url",
  x: "social_x_url",
} as const;

export type CreatorSocialUrlField =
  (typeof CREATOR_SOCIAL_URL_FIELDS)[CreatorSocialPlatform];
