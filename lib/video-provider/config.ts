export type VideoProviderId = "livepeer" | "frameworks";

const DEFAULT_PROVIDER: VideoProviderId = "livepeer";

/** Server-side selector for the video backend (default: Livepeer, unchanged in prod). */
export function resolveVideoProviderId(): VideoProviderId {
  const raw = process.env.VIDEO_PROVIDER?.trim().toLowerCase();
  if (raw === "frameworks" || raw === "livepeer") {
    return raw;
  }
  return DEFAULT_PROVIDER;
}

export function frameworksGraphqlUrl(): string {
  const raw =
    process.env.FRAMEWORKS_GRAPHQL_URL?.trim() ||
    "https://bridge.frameworks.network/graphql";
  return raw.replace(/\/$/, "");
}

export function frameworksApiToken(): string | undefined {
  const token = process.env.FRAMEWORKS_API_TOKEN?.trim();
  return token || undefined;
}

export function isFrameworksConfigured(): boolean {
  return Boolean(frameworksApiToken() && frameworksGraphqlUrl());
}
