import type { VideoProvider } from "./interface";
import { resolveVideoProviderId, type VideoProviderId } from "./config";
import { livepeerVideoProvider } from "./livepeer-provider";
import { frameworksVideoProvider } from "./frameworks-provider";

export type { VideoProvider } from "./interface";
export type { VideoProviderId } from "./config";
export type {
  AssetSummary,
  CreateClipParams,
  CreateClipResult,
  CreateStreamParams,
  CreatedStream,
  PlaybackInfoResult,
  StreamSession,
  StreamSummary,
} from "./types";
export {
  VideoProviderNotConfiguredError,
  VideoProviderNotImplementedError,
} from "./errors";
export {
  resolveVideoProviderId,
  frameworksGraphqlUrl,
  isFrameworksConfigured,
} from "./config";

let cached: VideoProvider | undefined;

export function getVideoProviderId(): VideoProviderId {
  return resolveVideoProviderId();
}

/** Returns the active server-side video provider (default Livepeer). */
export function getVideoProvider(): VideoProvider {
  const id = resolveVideoProviderId();
  if (cached?.id === id) {
    return cached;
  }
  cached = id === "frameworks" ? frameworksVideoProvider : livepeerVideoProvider;
  return cached;
}

/** Test helper — reset singleton between cases. */
export function resetVideoProviderForTests(): void {
  cached = undefined;
}
