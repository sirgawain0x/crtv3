export type CreatorSocialPlatform = "orb" | "instagram" | "x";

export type SocialProfileNormalizeResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

const X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

function stripAt(handle: string): string {
  return handle.replace(/^@+/, "").trim();
}

function isLikelyUrl(input: string): boolean {
  return /^https?:\/\//i.test(input) || /^www\./i.test(input);
}

function withHttps(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

function isValidXHandle(handle: string): boolean {
  return /^[A-Za-z0-9_]{1,50}$/.test(handle);
}

function isValidInstagramHandle(handle: string): boolean {
  return /^[A-Za-z0-9._]{1,30}$/.test(handle);
}

function isValidOrbProfileKey(key: string): boolean {
  if (/^0x[0-9a-fA-F]{40}$/.test(key)) {
    return true;
  }
  return /^[\w.-]{1,100}$/.test(key);
}

export function normalizeOrbProfileUrl(input: string): SocialProfileNormalizeResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: true, url: null };
  }

  if (isLikelyUrl(raw) || raw.includes("orb.club")) {
    try {
      const parsed = new URL(withHttps(raw));
      if (!parsed.hostname.toLowerCase().includes("orb.club")) {
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
      const profileKey = decodeURIComponent(segments[1]);
      if (!isValidOrbProfileKey(profileKey)) {
        return { ok: false, error: "Enter a valid Orb profile handle or address" };
      }
      const normalizedKey = profileKey.startsWith("0x")
        ? profileKey.toLowerCase()
        : profileKey;
      return {
        ok: true,
        url: `https://orb.club/p/${encodeURIComponent(normalizedKey)}`,
      };
    } catch {
      return { ok: false, error: "Enter a valid Orb profile URL or handle" };
    }
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

  if (isLikelyUrl(raw) || raw.includes("instagram.com")) {
    try {
      const parsed = new URL(withHttps(raw));
      if (!INSTAGRAM_HOSTS.has(parsed.hostname.toLowerCase())) {
        return {
          ok: false,
          error: "Enter an Instagram profile URL or @handle",
        };
      }
      const handle = parsed.pathname.split("/").filter(Boolean)[0];
      if (!handle || ["p", "reel", "reels", "stories", "explore"].includes(handle)) {
        return { ok: false, error: "Enter a valid Instagram profile handle" };
      }
      const cleaned = stripAt(handle);
      if (!isValidInstagramHandle(cleaned)) {
        return { ok: false, error: "Enter a valid Instagram profile handle" };
      }
      return { ok: true, url: `https://instagram.com/${cleaned}` };
    } catch {
      return { ok: false, error: "Enter a valid Instagram profile URL or @handle" };
    }
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

export function normalizeXProfileUrl(input: string): SocialProfileNormalizeResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: true, url: null };
  }

  if (isLikelyUrl(raw) || /(?:^|\.)((?:x|twitter)\.com)/i.test(raw)) {
    try {
      const parsed = new URL(withHttps(raw));
      if (!X_HOSTS.has(parsed.hostname.toLowerCase())) {
        return { ok: false, error: "Enter an X profile URL or @handle" };
      }
      const segment = parsed.pathname.split("/").filter(Boolean)[0];
      if (
        !segment ||
        ["home", "intent", "share", "i", "hashtag", "search"].includes(
          segment.toLowerCase(),
        )
      ) {
        return { ok: false, error: "Enter a valid X profile handle" };
      }
      const handle = stripAt(segment);
      if (!isValidXHandle(handle)) {
        return { ok: false, error: "Enter a valid X profile handle" };
      }
      return { ok: true, url: `https://x.com/${handle}` };
    } catch {
      return { ok: false, error: "Enter a valid X profile URL or @handle" };
    }
  }

  const handle = stripAt(raw);
  if (!isValidXHandle(handle)) {
    return {
      ok: false,
      error: "X handles use letters, numbers, and underscores (1–50 characters)",
    };
  }
  return { ok: true, url: `https://x.com/${handle}` };
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
