import type {
  CreateClipParams,
  CreateClipResult,
  CreateStreamParams,
  CreatedStream,
  StreamSession,
  StreamSummary,
} from "../types";
import { VideoProviderNotConfiguredError } from "../errors";
import { frameworksGraphqlRequest } from "../frameworks-graphql";
import { frameworksPlayHlsUrl } from "./constants";

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
    pushTargets?: Array<{
      id: string;
      name?: string;
      platform?: string;
      targetUri?: string;
      isEnabled?: boolean;
      status?: string;
    }>;
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

type SetPlaybackPolicyMutation = {
  setPlaybackPolicy: {
    __typename: string;
    id?: string;
    message?: string;
    field?: string;
  };
};

type StorageArtifactsQuery = {
  storageArtifactsConnection: {
    nodes: Array<{
      id: string;
      playbackId?: string;
      kind?: string;
      status?: string;
      createdAt?: string;
      durationMs?: number;
    }>;
  };
};

type CreatePushTargetMutation = {
  createPushTarget: {
    id: string;
    name?: string;
    platform?: string;
    targetUri?: string;
    isEnabled?: boolean;
    status?: string;
  };
};

type DeletePushTargetMutation = {
  deletePushTarget: {
    success?: boolean;
    deletedId?: string;
  };
};

type CreateClipMutation = {
  createClip: {
    __typename: string;
    id?: string;
    playbackId?: string;
    status?: string;
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
      streamKey
      isActive
    }
  }
`;

const GET_STREAM_MULTISTREAM = `
  query GetStreamMultistream($id: ID!) {
    stream(id: $id) {
      id
      pushTargets {
        id
        name
        platform
        targetUri
        isEnabled
        status
      }
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

const SET_PLAYBACK_POLICY = `
  mutation SetPlaybackPolicy($input: SetPlaybackPolicyInput!) {
    setPlaybackPolicy(input: $input) {
      __typename
      ... on Stream {
        id
      }
      ... on ValidationError {
        message
        field
      }
    }
  }
`;

const LIST_RECORDING_ARTIFACTS = `
  query ListRecordingArtifacts($input: StorageArtifactsInput!) {
    storageArtifactsConnection(input: $input) {
      nodes {
        id
        playbackId
        kind
        status
        createdAt
        durationMs
      }
    }
  }
`;

const CREATE_PUSH_TARGET = `
  mutation CreatePushTarget($streamId: ID!, $input: CreatePushTargetInput!) {
    createPushTarget(streamId: $streamId, input: $input) {
      id
      name
      platform
      targetUri
      isEnabled
      status
    }
  }
`;

const DELETE_PUSH_TARGET = `
  mutation DeletePushTarget($id: ID!) {
    deletePushTarget(id: $id) {
      success
      deletedId
    }
  }
`;

const CREATE_CLIP = `
  mutation CreateClip($input: CreateClipInput!) {
    createClip(input: $input) {
      __typename
      ... on Clip {
        id
        playbackId
        status
      }
      ... on ValidationError {
        message
        field
      }
    }
  }
`;

function toUnixSeconds(time: number): number {
  if (time > 1e12) return Math.floor(time / 1000);
  if (time > 1e9) return Math.floor(time);
  return Math.floor(time / 1000);
}

type FrameWorksPlaybackPolicyInput = {
  type: "PUBLIC" | "JWT" | "WEBHOOK";
  jwt?: { allowedKids?: string[] };
  webhook?: {
    url: string;
    secret?: string;
    timeoutMs?: number;
    context?: Record<string, unknown>;
  };
};

function mapLivepeerPlaybackPolicy(
  policy: Record<string, unknown>,
): FrameWorksPlaybackPolicyInput {
  const rawType = String(policy.type ?? "public").toLowerCase();
  if (rawType === "jwt") {
    const kid = process.env.FRAMEWORKS_SIGNING_KID?.trim();
    const allowedKids = Array.isArray(policy.allowedKids)
      ? (policy.allowedKids as string[])
      : kid
        ? [kid]
        : [];
    return {
      type: "JWT",
      jwt: allowedKids.length ? { allowedKids } : {},
    };
  }
  if (rawType === "webhook") {
    const url =
      typeof policy.url === "string"
        ? policy.url
        : typeof policy.webhookUrl === "string"
          ? policy.webhookUrl
          : undefined;
    if (url) {
      return {
        type: "WEBHOOK",
        webhook: {
          url,
          secret:
            typeof policy.secret === "string"
              ? policy.secret
              : process.env.FRAMEWORKS_WEBHOOK_SECRET,
          context:
            typeof policy.webhookContext === "object" && policy.webhookContext
              ? (policy.webhookContext as Record<string, unknown>)
              : undefined,
        },
      };
    }
  }
  return { type: "PUBLIC" };
}

async function applyPlaybackPolicy(
  streamId: string,
  playbackPolicy: Record<string, unknown>,
): Promise<void> {
  const policy = mapLivepeerPlaybackPolicy(playbackPolicy);
  const data = await frameworksGraphqlRequest<SetPlaybackPolicyMutation>(
    SET_PLAYBACK_POLICY,
    {
      input: {
        streamId,
        policy,
      },
    },
  );
  const result = data.setPlaybackPolicy;
  if (result.__typename === "ValidationError") {
    throw new Error(result.message ?? "FrameWorks setPlaybackPolicy validation error");
  }
}

function mapArtifactToSession(node: StorageArtifactsQuery["storageArtifactsConnection"]["nodes"][number]): StreamSession {
  const ready = (node.status ?? "").toLowerCase() === "ready";
  const createdAt =
    node.createdAt != null ? Math.floor(Date.parse(String(node.createdAt)) / 1000) : undefined;
  return {
    id: node.id,
    recordingStatus: ready ? "ready" : node.status,
    recordingUrl: node.playbackId ? frameworksPlayHlsUrl(node.playbackId) : undefined,
    mp4Url: node.playbackId
      ? frameworksPlayHlsUrl(node.playbackId).replace("/hls/index.m3u8", ".mp4")
      : undefined,
    sourceSegmentsDuration:
      node.durationMs != null ? Math.round(node.durationMs / 1000) : undefined,
    createdAt,
  };
}

type TargetAddSpec = {
  profile?: string;
  videoOnly?: boolean;
  spec?: { name?: string; url?: string };
};

export const frameworksStreams = {
  getOrNull: async (streamId: string): Promise<StreamSummary | null> => {
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

  create: async (params: CreateStreamParams): Promise<CreatedStream> => {
    const data = await frameworksGraphqlRequest<CreateStreamMutation>(CREATE_STREAM, {
      input: {
        name: params.name,
        record: params.record,
      },
    });
    const result = data.createStream;
    if (result.__typename === "ValidationError") {
      throw new Error(result.message ?? "FrameWorks validation error");
    }
    if (!result.id || !result.playbackId || !result.streamKey) {
      throw new Error("FrameWorks createStream missing identifiers");
    }
    if (params.playbackPolicy && Object.keys(params.playbackPolicy).length > 0) {
      await applyPlaybackPolicy(result.id, params.playbackPolicy);
    }
    return {
      streamId: result.id,
      playbackId: result.playbackId,
      streamKey: result.streamKey,
    };
  },

  setRecording: async (streamId: string, record: boolean): Promise<void> => {
    const data = await frameworksGraphqlRequest<UpdateStreamMutation>(UPDATE_STREAM, {
      id: streamId,
      input: { record },
    });
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

  getSessions: async (
    streamId: string,
    options?: { record?: boolean },
  ): Promise<StreamSession[]> => {
    if (!options?.record) {
      return [];
    }
    const data = await frameworksGraphqlRequest<StorageArtifactsQuery>(
      LIST_RECORDING_ARTIFACTS,
      {
        input: {
          streamId,
          kinds: ["CHAPTER", "DVR"],
          status: "ready",
          first: 50,
        },
      },
    );
    return (data.storageArtifactsConnection?.nodes ?? []).map(mapArtifactToSession);
  },

  getWithMultistream: async (streamId: string): Promise<unknown> => {
    const data = await frameworksGraphqlRequest<GetStreamQuery>(GET_STREAM_MULTISTREAM, {
      id: streamId,
    });
    if (!data.stream) {
      return null;
    }
    const targets = (data.stream.pushTargets ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      url: t.targetUri,
      platform: t.platform,
      enabled: t.isEnabled,
      status: t.status,
    }));
    return {
      stream: {
        id: data.stream.id,
        multistream: { targets },
      },
    };
  },

  addMultistreamTarget: async (spec: unknown, streamId: string): Promise<unknown> => {
    const payload = spec as TargetAddSpec;
    const url = payload.spec?.url?.trim();
    if (!url) {
      throw new Error("Multistream target URL is required");
    }
    const data = await frameworksGraphqlRequest<CreatePushTargetMutation>(CREATE_PUSH_TARGET, {
      streamId,
      input: {
        platform: "custom",
        name: payload.spec?.name ?? `Target ${Date.now()}`,
        targetUri: url,
        videoChoice: payload.videoOnly ? "PROCESSED_VIDEO" : "AUTO",
      },
    });
    return {
      ...data.createPushTarget,
      url,
    };
  },

  createClip: async (params: CreateClipParams): Promise<CreateClipResult> => {
    if (!params.sessionId || params.startTime == null || params.endTime == null) {
      return {
        playbackUrl: "",
        assetId: "",
        newPlaybackId: "",
        error: "Missing required fields",
      };
    }

    const startSec = toUnixSeconds(params.startTime);
    const endSec = toUnixSeconds(params.endTime);
    if (endSec <= startSec) {
      return {
        playbackUrl: "",
        assetId: "",
        newPlaybackId: "",
        error: "Invalid clip time range",
      };
    }

    try {
      const data = await frameworksGraphqlRequest<CreateClipMutation>(CREATE_CLIP, {
        input: {
          streamId: params.sessionId,
          title: params.name ?? "Clip",
          mode: "ABSOLUTE",
          startUnix: startSec,
          stopUnix: endSec,
        },
      });
      const result = data.createClip;
      if (result.__typename === "ValidationError") {
        return {
          playbackUrl: "",
          assetId: "",
          newPlaybackId: "",
          error: result.message ?? "Validation error",
        };
      }
      const playbackId = result.playbackId ?? "";
      const assetId = result.id ?? "";
      if (!playbackId) {
        return {
          playbackUrl: "",
          assetId,
          newPlaybackId: "",
          error: "Clip created but playback ID not ready yet.",
        };
      }
      return {
        playbackUrl: frameworksPlayHlsUrl(playbackId),
        assetId,
        newPlaybackId: playbackId,
      };
    } catch (e: unknown) {
      return {
        playbackUrl: "",
        assetId: "",
        newPlaybackId: "",
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  },
};

export async function frameworksDeletePushTarget(targetId: string): Promise<void> {
  const data = await frameworksGraphqlRequest<DeletePushTargetMutation>(DELETE_PUSH_TARGET, {
    id: targetId,
  });
  if (data.deletePushTarget?.success === false) {
    throw new Error("Failed to delete FrameWorks push target");
  }
}
