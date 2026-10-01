import { REALITY_ETH_CHAIN_ID } from "@/context/context";

export type RealitySocialConfig = {
  chainIds: number[];
  noop: boolean;
  twitterEnabled: boolean;
  mastodonEnabled: boolean;
  siteBaseUrl: string;
  maxPostsPerRun: number;
};

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  return defaultValue;
}

function resolveSiteBaseUrl(): string {
  const explicit =
    process.env.REALITY_SOCIAL_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "https://creativetv.xyz";
}

export function getRealitySocialConfig(): RealitySocialConfig {
  const chainRaw =
    process.env.REALITY_SOCIAL_CHAIN_IDS?.trim() ||
    String(REALITY_ETH_CHAIN_ID);

  const chainIds = chainRaw
    .split(",")
    .map((part) => parseInt(part.trim(), 10))
    .filter((id) => Number.isFinite(id) && id > 0);

  return {
    chainIds: chainIds.length > 0 ? chainIds : [REALITY_ETH_CHAIN_ID],
    noop: parseBool(process.env.REALITY_SOCIAL_NOOP, false),
    twitterEnabled: parseBool(process.env.REALITY_SOCIAL_ENABLE_TWITTER, true),
    mastodonEnabled: parseBool(process.env.REALITY_SOCIAL_ENABLE_MASTODON, true),
    siteBaseUrl: resolveSiteBaseUrl(),
    maxPostsPerRun: Math.min(
      25,
      Math.max(1, parseInt(process.env.REALITY_SOCIAL_MAX_POSTS_PER_RUN ?? "5", 10) || 5),
    ),
  };
}

export function hasTwitterCredentials(): boolean {
  return Boolean(
    process.env.TWITTER_CONSUMER_KEY &&
      process.env.TWITTER_CONSUMER_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      process.env.TWITTER_ACCESS_TOKEN_SECRET,
  );
}

export function hasMastodonCredentials(): boolean {
  return Boolean(
    process.env.MASTODON_INSTANCE_URL?.trim() &&
      process.env.MASTODON_ACCESS_TOKEN?.trim(),
  );
}
