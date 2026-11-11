import type { VideoProvider } from "./interface";
import type {
  AssetSummary,
  CreateClipParams,
  CreateClipResult,
  CreateStreamParams,
  CreatedStream,
  PlaybackInfoResult,
  StreamSession,
  StreamSummary,
} from "./types";
import {
  VideoProviderNotConfiguredError,
  VideoProviderNotImplementedError,
} from "./errors";
import { frameworksGraphqlRequest } from "./frameworks-graphql";
import { isFrameworksConfigured, frameworksGraphqlUrl } from "./config";
import {
  assertStreamCreationAvailable,
  FrameWorksStreamsCreateUnavailableError,
} from "./streams-create-guard";

function notImplemented(operation: string): never {
  throw new VideoProviderNotImplementedError("frameworks", operation);
}

type CreateStreamMutation = {
  createStream: {
    __typename: string;
    id?: string;
    playbackId?: string;
    streamKey?: string;
    message?: string;
    field?: string;
  };
};

type GetStreamQuery = {
  stream: {
    id: string;
    name?: string;
    playbackId?: string;
    streamKey?: string;
    isActive?: boolean;
  } | null;
};

type UpdateStreamMutation = {
  updateStream: {
    __typename: string;
    id?: string;
    record?: boolean;
    message?: string;
    field?: string;
  };
};

const CREATE_STREAM = `
  mutation CreateStream($input: CreateStreamInput!) {
    createStream(input: $input) {
      __typename
      ... on StreamWithKey {
        id
        playbackId
        streamKey
      }
      ... on ValidationError {
        message
        field
      }
    }
  }
`;

const GET_STREAM = `
  query GetStream($id: ID!) {
    stream(id: $id) {
      id
      name
      playbackId
      isActive
    }
  }
`;

const UPDATE_STREAM = `
  mutation UpdateStream($id: ID!, $input: UpdateStreamInput!) {
    updateStream(id: $id, input: $input) {
      __typename
      ... on Stream {
        id
        record
      }
      ... on ValidationError {
        message
        field
      }
    }
  }
`;

export const frameworksVideoProvider: VideoProvider = {
  id: "frameworks",

  isConfigured: () => isFrameworksConfigured(),
  hasPrivateMetricsKey: () => Boolean(process.env.FRAMEWORKS_API_TOKEN?.trim()),
  apiBaseUrl: () => frameworksGraphqlUrl(),
  resolveAuthToken: () => process.env.FRAMEWORKS_API_TOKEN?.trim(),
  getLivepeerSdkClient: () => null,

  streams: {
    getOrNull: async (streamId): Promise<StreamSummary | null> => {
      try {
        const data = await frameworksGraphqlRequest<GetStreamQuery>(GET_STREAM, {
          id: streamId,
        });
        if (!data.stream) return null;
        return {
          id: data.stream.id,
          playbackId: data.stream.playbackId,
          streamKey: data.stream.streamKey,
          name: data.stream.name,
          isActive: data.stream.isActive,
        };
      } catch (err) {
        if (err instanceof VideoProviderNotConfiguredError) throw err;
        if (err instanceof Error && err.message.toLowerCase().includes("not found")) {
          return null;
        }
        throw err;
      }
    },
    create: async (_params: CreateStreamParams): Promise<CreatedStream> => {
      assertStreamCreationAvailable("frameworks-provider.streams.create");
      throw new FrameWorksStreamsCreateUnavailableError();
    },
    setRecording: async (streamId, record) => {
      const data = await frameworksGraphqlRequest<UpdateStreamMutation>(
        UPDATE_STREAM,
        {
          id: streamId,
          input: { record },
        },
      );
      const result = data.updateStream;
      if (result.__typename === "ValidationError") {
        throw new Error(result.message ?? "FrameWorks validation error");
      }
      if (result.__typename !== "Stream") {
        throw new Error(
          `FrameWorks updateStream failed (${result.__typename ?? "unknown"})`,
        );
      }
    },
    getSessions: async (): Promise<StreamSession[]> => notImplemented("streams.getSessions"),
    getWithMultistream: async () => notImplemented("streams.getWithMultistream"),
    addMultistreamTarget: async (_spec, _streamId) =>
      notImplemented("streams.addMultistreamTarget"),
    createClip: async (_params: CreateClipParams): Promise<CreateClipResult> => {
      notImplemented("streams.createClip");
    },
  },

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

  playback: {
    get: async (): Promise<PlaybackInfoResult> => notImplemented("playback.get"),
  },

  multistream: {
    delete: async () => notImplemented("multistream.delete"),
  },

  ai: {
    isEnabled: () => false,
    textToImage: async () => notImplemented("ai.textToImage"),
  },

  webhookSecretEnvKey: () => "FRAMEWORKS_WEBHOOK_SECRET",
};
