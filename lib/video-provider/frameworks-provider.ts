import type { VideoProvider } from "./interface";
import type { AssetSummary, PlaybackInfoResult } from "./types";
import { VideoProviderNotImplementedError } from "./errors";
import { isFrameworksConfigured, frameworksGraphqlUrl } from "./config";
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

  assets: {
    get: async (): Promise<AssetSummary | null> => notImplemented("assets.get"),
    listRecentRecordings: async (): Promise<AssetSummary[]> =>
      notImplemented("assets.listRecentRecordings"),
    getAll: async () => notImplemented("assets.getAll"),
    getById: async () => notImplemented("assets.getById"),
    create: async () => notImplemented("assets.create"),
    update: async () => notImplemented("assets.update"),
    createViaUrl: async () => notImplemented("assets.createViaUrl"),
    delete: async () => notImplemented("assets.delete"),
  },

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
