import type { VideoProvider } from "./interface";
import type { AssetSummary, PlaybackInfoResult } from "./types";
import { VideoProviderNotImplementedError } from "./errors";
import { isFrameworksConfigured, frameworksGraphqlUrl } from "./config";
import { frameworksAssets } from "./frameworks/assets";
import { frameworksPlayback } from "./frameworks/playback";
import { frameworksDeletePushTarget, frameworksStreams } from "./frameworks/streams";

function notImplemented(operation: string): never {
  throw new VideoProviderNotImplementedError("frameworks", operation);
}

export const frameworksVideoProvider: VideoProvider = {
  id: "frameworks",

  isConfigured: () => isFrameworksConfigured(),
  hasPrivateMetricsKey: () => Boolean(process.env.FRAMEWORKS_API_TOKEN?.trim()),
  apiBaseUrl: () => frameworksGraphqlUrl(),
  resolveAuthToken: () => process.env.FRAMEWORKS_API_TOKEN?.trim(),
  getLivepeerSdkClient: () => null,

  streams: frameworksStreams,

  assets: frameworksAssets,

  playback: frameworksPlayback,

  multistream: {
    delete: frameworksDeletePushTarget,
  },

  ai: {
    isEnabled: () => false,
    textToImage: async () => notImplemented("ai.textToImage"),
  },

  webhookSecretEnvKey: () => "FRAMEWORKS_WEBHOOK_SECRET",
};
