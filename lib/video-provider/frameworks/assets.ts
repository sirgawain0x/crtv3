import type { AssetSummary } from "../types";
import { FrameworksGraphqlUnionError } from "../errors";
import { frameworksGraphqlRequest } from "../frameworks-graphql";
import { frameworksPlayHlsUrl } from "./constants";
import { requireVodSigningKeyId, secureFrameworksVod } from "./vod-policy";

type GraphqlUnionMember = {
  __typename: string;
  message?: string;
  field?: string;
};

function assertGraphqlUnionSuccess<T extends GraphqlUnionMember>(
  result: T,
  successTypename: string,
  operation: string,
): asserts result is T & { __typename: typeof successTypename } {
  if (result.__typename === successTypename) {
    return;
  }
  const message =
    typeof result.message === "string" && result.message.trim().length > 0
      ? result.message
      : `FrameWorks ${operation} failed (${result.__typename})`;
  throw new FrameworksGraphqlUnionError(result.__typename, message);
}

type VodAssetNode = {
  id: string;
  artifactHash?: string;
  playbackId?: string;
  title?: string;
  status?: string;
  durationMs?: number;
  createdAt?: string;
  streamId?: string;
};

type VodAssetQuery = { vodAsset: VodAssetNode | null };
type ClipQuery = {
  clip: {
    id: string;
    clipHash?: string;
    playbackId?: string;
    title?: string;
    status?: string;
    duration?: number;
    streamId?: string;
  } | null;
};

type StorageArtifactsQuery = {
  storageArtifactsConnection: {
    nodes: Array<{
      id: string;
      artifactHash?: string;
      playbackId?: string;
      title?: string;
      kind?: string;
      status?: string;
      durationSeconds?: number;
      createdAt?: string;
      streamId?: string;
    }>;
    totalCount?: number;
  };
};

type CreateVodUploadMutation = {
  createVodUpload: {
    __typename: string;
    id?: string;
    artifactId?: string;
    artifactHash?: string;
    playbackId?: string;
    partSize?: number;
    expiresAt?: string;
    parts?: Array<{ partNumber?: number; presignedUrl?: string }>;
    message?: string;
    field?: string;
  };
};

type CompleteVodUploadMutation = {
  completeVodUpload: {
    __typename: string;
    id?: string;
    artifactHash?: string;
    playbackId?: string;
    status?: string;
    message?: string;
    field?: string;
  };
};

type DeleteVodAssetMutation = {
  deleteVodAsset: {
    __typename: string;
    success?: boolean;
    message?: string;
  };
};

type AbortVodUploadMutation = {
  abortVodUpload: {
    __typename: string;
    success?: boolean;
    message?: string;
  };
};

const GET_VOD_ASSET = `
  query GetVodAsset($id: ID!) {
    vodAsset(id: $id) {
      id
      artifactHash
      playbackId
      title
      status
      durationMs
      createdAt
      streamId
    }
  }
`;

const GET_CLIP = `
  query GetClip($id: ID!) {
    clip(id: $id) {
      id
      clipHash
      playbackId
      title
      status
      duration
      streamId
    }
  }
`;

const LIST_ARTIFACTS = `
  query ListArtifacts($input: StorageArtifactsInput!) {
    storageArtifactsConnection(input: $input) {
      totalCount
      nodes {
        id
        artifactHash: hash
        playbackId
        title
        kind
        status
        durationSeconds
        createdAt
        streamId
      }
    }
  }
`;

const CREATE_VOD_UPLOAD = `
  mutation CreateVodUpload($input: CreateVodUploadInput!) {
    createVodUpload(input: $input) {
      __typename
      ... on VodUploadSession {
        id
        artifactId
        artifactHash
        playbackId
        partSize
        expiresAt
        parts {
          partNumber
          presignedUrl
        }
      }
      ... on ValidationError {
        message
        field
      }
      ... on AuthError {
        message
      }
    }
  }
`;

const COMPLETE_VOD_UPLOAD = `
  mutation CompleteVodUpload($input: CompleteVodUploadInput!) {
    completeVodUpload(input: $input) {
      __typename
      ... on VodAsset {
        id
        artifactHash
        playbackId
        status
      }
      ... on ValidationError {
        message
        field
      }
      ... on NotFoundError {
        message
      }
      ... on AuthError {
        message
      }
    }
  }
`;

const DELETE_VOD_ASSET = `
  mutation DeleteVodAsset($id: ID!) {
    deleteVodAsset(id: $id) {
      __typename
      ... on DeleteSuccess {
        success
      }
      ... on NotFoundError {
        message
      }
      ... on AuthError {
        message
      }
    }
  }
`;

const ABORT_VOD_UPLOAD = `
  mutation AbortVodUpload($uploadId: ID!) {
    abortVodUpload(uploadId: $uploadId) {
      __typename
      ... on DeleteSuccess {
        success
      }
      ... on NotFoundError {
        message
      }
      ... on AuthError {
        message
      }
    }
  }
`;

function mapStatusToPhase(status?: string, kind = "vod"): { phase?: string } | undefined {
  if (!status) return undefined;
  const normalized = status.toLowerCase();
  if (normalized === "ready" || (kind === "clip" && normalized === "done")) return { phase: "ready" };
  if (normalized === "failed" || /^[a-z][a-z0-9]*([_-][a-z0-9]+)*[_-]failed$/.test(normalized)) return { phase: "failed" };
  return { phase: "processing" };
}

function mapVodToSummary(node: VodAssetNode, kind = "vod"): AssetSummary {
  return {
    id: node.artifactHash?.trim() || node.id,
    name: node.title,
    playbackId: node.playbackId,
    playbackUrl: node.playbackId ? frameworksPlayHlsUrl(node.playbackId) : undefined,
    source: {
      type: kind === "recording" ? "recording" : kind,
      streamId: node.streamId,
    },
    videoSpec:
      node.durationMs != null
        ? { duration: Math.round(node.durationMs / 1000) }
        : undefined,
    status: mapStatusToPhase(node.status, kind),
    providerProcessingStatus: node.status,
  };
}

function storageArtifactCanonicalId(
  node: StorageArtifactsQuery["storageArtifactsConnection"]["nodes"][number],
): string {
  const hash = node.artifactHash?.trim();
  return hash && hash.length > 0 ? hash : node.id;
}

function mapArtifactToSummary(
  node: StorageArtifactsQuery["storageArtifactsConnection"]["nodes"][number],
): AssetSummary {
  const kind = (node.kind ?? "VOD").toLowerCase();
  const summary = mapVodToSummary(
    {
      id: storageArtifactCanonicalId(node),
      playbackId: node.playbackId,
      title: node.title,
      status: node.status,
      streamId: node.streamId,
    },
    kind === "chapter" || kind === "dvr" ? "recording" : kind,
  );
  if (node.durationSeconds != null) {
    summary.videoSpec = { duration: Math.round(node.durationSeconds) };
  }
  return summary;
}

async function fetchStorageArtifactByHash(hash: string): Promise<AssetSummary | null> {
  const data = await frameworksGraphqlRequest<StorageArtifactsQuery>(LIST_ARTIFACTS, {
    input: { artifactHash: hash, first: 1 },
  });
  const node = data.storageArtifactsConnection?.nodes?.[0];
  return node ? mapArtifactToSummary(node) : null;
}

async function fetchAssetSummary(assetId: string): Promise<AssetSummary | null> {
  const storageArtifact = await fetchStorageArtifactByHash(assetId);
  if (storageArtifact) return storageArtifact;

  const vod = await frameworksGraphqlRequest<VodAssetQuery>(GET_VOD_ASSET, { id: assetId });
  if (vod.vodAsset) return mapVodToSummary(vod.vodAsset);
  const clip = await frameworksGraphqlRequest<ClipQuery>(GET_CLIP, { id: assetId });
  if (clip.clip) {
    return mapVodToSummary(
      {
        id: clip.clip.id,
        artifactHash: clip.clip.clipHash,
        playbackId: clip.clip.playbackId,
        title: clip.clip.title,
        status: clip.clip.status,
        durationMs: clip.clip.duration != null ? clip.clip.duration * 1000 : undefined,
        streamId: clip.clip.streamId,
      },
      "clip",
    );
  }
  return null;
}

function requireArtifactHash(result: { artifactHash?: string }): string {
  const hash = result.artifactHash?.trim();
  if (!hash) throw new Error("FrameWorks returned no canonical artifact hash");
  return hash;
}

type LivepeerCreateBody = {
  name?: string;
  storage?: { ipfs?: boolean };
  creatorId?: { type?: string; value?: string };
};

export const frameworksAssets = {
  get: fetchAssetSummary,

  listRecentRecordings: async (limit = 20): Promise<AssetSummary[]> => {
    const data = await frameworksGraphqlRequest<StorageArtifactsQuery>(LIST_ARTIFACTS, {
      input: {
        kinds: ["CHAPTER", "DVR"],
        status: "ready",
        first: limit,
        sort: "CREATED_AT",
        direction: "DESC",
      },
    });
    return (data.storageArtifactsConnection?.nodes ?? []).map(mapArtifactToSummary);
  },

  getAll: async (): Promise<unknown> => {
    const data = await frameworksGraphqlRequest<StorageArtifactsQuery>(LIST_ARTIFACTS, {
      input: { first: 50 },
    });
    return { data: (data.storageArtifactsConnection?.nodes ?? []).map(mapArtifactToSummary) };
  },

  getById: async (assetId: string): Promise<unknown> => {
    const asset = await fetchAssetSummary(assetId);
    return asset ? { asset } : null;
  },

  create: async (body: unknown): Promise<unknown> => {
    const payload = body as LivepeerCreateBody & {
      sizeBytes?: number;
      filename?: string;
      contentType?: string;
    };
    const filename = payload.filename ?? payload.name ?? "upload.mp4";
    const sizeBytes = payload.sizeBytes;
    if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new Error("sizeBytes is required and must be a positive number");
    }
    requireVodSigningKeyId();
    const data = await frameworksGraphqlRequest<CreateVodUploadMutation>(CREATE_VOD_UPLOAD, {
      input: {
        filename,
        sizeBytes,
        title: payload.name,
        contentType: payload.contentType ?? "video/mp4",
      },
    });
    const uploadResult = data.createVodUpload;
    assertGraphqlUnionSuccess(uploadResult, "VodUploadSession", "createVodUpload");
    const upload = uploadResult;
    const canonicalId = requireArtifactHash(upload);
    if (!upload.playbackId) throw new Error("FrameWorks returned no VOD playback ID");
    await secureFrameworksVod(canonicalId, upload.playbackId);
    const presignedParts = (upload.parts ?? []).map((part) => ({
      partNumber: part.partNumber,
      url: part.presignedUrl,
    }));
    const assetLookupId = canonicalId;
    return {
      data: {
        asset: {
          id: assetLookupId,
          playbackId: upload.playbackId,
          status: { phase: "waiting" },
          name: payload.name,
        },
        uploadId: upload.id,
        partSize: upload.partSize,
        expiresAt: upload.expiresAt,
        presignedParts,
      },
    };
  },

  completeUpload: async (body: unknown): Promise<unknown> => {
    const payload = body as {
      uploadId?: string;
      parts?: Array<{ partNumber: number; etag: string }>;
    };
    if (!payload.uploadId?.trim()) {
      throw new Error("uploadId is required");
    }
    if (!payload.parts?.length) {
      throw new Error("parts are required");
    }
    const data = await frameworksGraphqlRequest<CompleteVodUploadMutation>(
      COMPLETE_VOD_UPLOAD,
      {
        input: {
          uploadId: payload.uploadId,
          parts: payload.parts,
        },
      },
    );
    const result = data.completeVodUpload;
    assertGraphqlUnionSuccess(result, "VodAsset", "completeVodUpload");
    return {
      data: {
        asset: {
          id: requireArtifactHash(result),
          playbackId: result.playbackId,
          status: { phase: result.status ?? "processing" },
        },
      },
    };
  },

  abortUpload: async (uploadId: string): Promise<void> => {
    const trimmed = uploadId.trim();
    if (!trimmed) return;
    const data = await frameworksGraphqlRequest<AbortVodUploadMutation>(ABORT_VOD_UPLOAD, {
      uploadId: trimmed,
    });
    const result = data.abortVodUpload;
    assertGraphqlUnionSuccess(result, "DeleteSuccess", "abortVodUpload");
  },

  update: async (): Promise<unknown> => {
    throw new Error("FrameWorks asset metadata update is not exposed on VideoProvider yet");
  },

  createViaUrl: async (body: unknown): Promise<unknown> => {
    // URL imports start fetching immediately; they cannot establish access policy before bytes arrive.
    void body;
    throw new Error("FrameWorks URL imports are disabled; use protected multipart upload");
  },

  delete: async (assetId: string): Promise<void> => {
    const data = await frameworksGraphqlRequest<DeleteVodAssetMutation>(DELETE_VOD_ASSET, {
      id: assetId,
    });
    assertGraphqlUnionSuccess(data.deleteVodAsset, "DeleteSuccess", "deleteVodAsset");
  },
};
