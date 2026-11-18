import { serverLogger } from "@/lib/utils/logger";

export type VideoProviderId = "livepeer" | "frameworks";

const DEFAULT_PROVIDER: VideoProviderId = "livepeer";

let lastInvalidVideoProviderWarning: string | undefined;

/** Server-side selector for the video backend (default: Livepeer, unchanged in prod). */
export function resolveVideoProviderId(): VideoProviderId {
  const raw = process.env.VIDEO_PROVIDER?.trim().toLowerCase();
  if (raw === "frameworks" || raw === "livepeer") {
    return raw;
  }
  if (raw) {
    if (lastInvalidVideoProviderWarning !== raw) {
      lastInvalidVideoProviderWarning = raw;
      serverLogger.warn(
        "[video-provider] Ignoring invalid VIDEO_PROVIDER; falling back to livepeer",
        { provided: process.env.VIDEO_PROVIDER?.trim(), fallback: DEFAULT_PROVIDER },
      );
    }
  }
  return DEFAULT_PROVIDER;
}

/** Test helper — reset invalid-provider warning dedupe. */
export function resetInvalidVideoProviderWarningForTests(): void {
  lastInvalidVideoProviderWarning = undefined;
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
