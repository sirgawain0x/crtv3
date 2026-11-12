import type { VideoProvider } from "./interface";
import {
  resetInvalidVideoProviderWarningForTests,
  resolveVideoProviderId,
  type VideoProviderId,
} from "./config";
import { livepeerVideoProvider } from "./livepeer-provider";
import { frameworksVideoProvider } from "./frameworks-provider";
import { assertUploadsAndAssetsAvailable } from "./uploads-assets-guard";
import { assertStreamCreationAvailable } from "./streams-create-guard";

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
export {
  assertUploadsAndAssetsAvailable,
  FrameWorksUploadsAssetsUnavailableError,
} from "./uploads-assets-guard";
export {
  assertStreamCreationAvailable,
  FrameWorksStreamsCreateUnavailableError,
} from "./streams-create-guard";

let cached: VideoProvider | undefined;

export function getVideoProviderId(): VideoProviderId {
  return resolveVideoProviderId();
}

/** Upload/asset boundary guard (#406 removes this when FrameWorks assets ship). */
export function requireVideoProviderForUploadsAndAssets(
  operation: string,
): VideoProvider {
  assertUploadsAndAssetsAvailable(operation);
  return getVideoProvider();
}

/** Stream-create boundary guard (#404 removes this when FrameWorks create ships). */
export function requireVideoProviderForStreamCreate(
  operation: string,
): VideoProvider {
  assertStreamCreationAvailable(operation);
  return getVideoProvider();
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
  resetInvalidVideoProviderWarningForTests();
}
