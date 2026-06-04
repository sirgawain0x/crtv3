import { timingSafeEqual } from "crypto";

export type PlatformApiKeyTier = "admin" | "partner";

export type ParsedPlatformApiKeys = {
  adminSecrets: string[];
  partnerKeys: Map<string, string>;
};

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function parseCommaList(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parsePlatformApiKeysFromEnv(env: NodeJS.ProcessEnv = process.env): ParsedPlatformApiKeys {
  const adminSecrets = parseCommaList(env.CREATIVE_PLATFORM_ADMIN_API_KEYS);

  const partnerKeys = new Map<string, string>();
  for (const entry of parseCommaList(env.CREATIVE_PLATFORM_PARTNER_API_KEYS)) {
    const colonIndex = entry.indexOf(":");
    if (colonIndex <= 0) {
      continue;
    }
    const id = entry.slice(0, colonIndex).trim();
    const secret = entry.slice(colonIndex + 1).trim();
    if (id && secret) {
      partnerKeys.set(id, secret);
    }
  }

  return { adminSecrets, partnerKeys };
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function matchPlatformApiKey(
  token: string,
  keys: ParsedPlatformApiKeys,
): { tier: PlatformApiKeyTier; keyId?: string } | null {
  for (const secret of keys.adminSecrets) {
    if (safeEqual(token, secret)) {
      return { tier: "admin" };
    }
  }

  for (const [keyId, secret] of keys.partnerKeys.entries()) {
    if (safeEqual(token, secret)) {
      return { tier: "partner", keyId };
    }
  }

  return null;
}

export function isPlatformApiAccessConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PLATFORM_API_ACCESS_ENABLED === "false") {
    return false;
  }
  if (env.PLATFORM_API_ACCESS_ENABLED === "true") {
    return true;
  }

  const keys = parsePlatformApiKeysFromEnv(env);
  return (
    keys.adminSecrets.length > 0 ||
    keys.partnerKeys.size > 0 ||
    Boolean(env.X402_API_RECIPIENT?.trim())
  );
}
