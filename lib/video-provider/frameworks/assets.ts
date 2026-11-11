import type { AssetSummary } from "../types";
import { frameworksGraphqlRequest } from "../frameworks-graphql";
import { frameworksPlayHlsUrl } from "./constants";

type VodAssetNode = {
  id: string;
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
      playbackId?: string;
      title?: string;
      kind?: string;
      status?: string;
      durationMs?: number;
      createdAt?: string;
      streamId?: string;
    }>;
    totalCount?: number;
  };
};

type CreateVodUploadMutation = {
  createVodUpload: {
    __typename: string;
    uploadId?: string;
    assetId?: string;
    playbackId?: string;
    partSize?: number;
    presignedParts?: Array<{ partNumber?: number; url?: string }>;
    message?: string;
    field?: string;
  };
};

type CompleteVodUploadMutation = {
  completeVodUpload: {
    __typename: string;
    id?: string;
    playbackId?: string;
    status?: string;
    message?: string;
    field?: string;
  };
};

type ImportVodAssetMutation = {
  importVodAsset: {
    __typename: string;
    id?: string;
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

const GET_VOD_ASSET = `
  query GetVodAsset($id: ID!) {
    vodAsset(id: $id) {
      id
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
        playbackId
        title
        kind
        status
        durationMs
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
        uploadId
        assetId
        playbackId
        partSize
        presignedParts {
          partNumber
          url
        }
      }
      ... on ValidationError {
        message
        field
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

const IMPORT_VOD_ASSET = `
  mutation ImportVodAsset($input: ImportVodAssetInput!) {
    importVodAsset(input: $input) {
      __typename
      ... on VodAsset {
        id
        playbackId
        status
        title
      }
      ... on ValidationError {
        message
        field
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
    }
  }
`;

function mapStatusToPhase(status?: string): { phase?: string } | undefined {
  if (!status) return undefined;
  const normalized = status.toLowerCase();
  if (normalized === "ready") return { phase: "ready" };
  if (normalized === "failed") return { phase: "failed" };
  return { phase: "processing" };
}

function mapVodToSummary(node: VodAssetNode, kind = "vod"): AssetSummary {
  return {
    id: node.id,
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
    status: mapStatusToPhase(node.status),
  };
}

function mapArtifactToSummary(
  node: StorageArtifactsQuery["storageArtifactsConnection"]["nodes"][number],
): AssetSummary {
  const kind = (node.kind ?? "VOD").toLowerCase();
  return mapVodToSummary(
    {
      id: node.id,
      playbackId: node.playbackId,
      title: node.title,
      status: node.status,
      durationMs: node.durationMs,
      streamId: node.streamId,
    },
    kind === "chapter" || kind === "dvr" ? "recording" : kind,
  );
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
    const data = await frameworksGraphqlRequest<CreateVodUploadMutation>(CREATE_VOD_UPLOAD, {
      input: {
        filename,
        sizeBytes,
        title: payload.name,
        contentType: payload.contentType ?? "video/mp4",
      },
    });
    if (data.createVodUpload.__typename === "ValidationError") {
      throw new Error(data.createVodUpload.message ?? "Invalid VOD upload");
    }
    const upload = data.createVodUpload;
    return {
      data: {
        asset: upload.assetId
          ? {
              id: upload.assetId,
              playbackId: upload.playbackId,
              status: { phase: "waiting" },
              name: payload.name,
            }
          : { id: upload.uploadId },
        uploadId: upload.uploadId,
        partSize: upload.partSize,
        presignedParts: upload.presignedParts,
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
    if (result.__typename === "ValidationError") {
      throw new Error(result.message ?? "Failed to complete VOD upload");
    }
    return {
      data: {
        asset: {
          id: result.id,
          playbackId: result.playbackId,
          status: { phase: result.status ?? "processing" },
        },
      },
    };
  },

  update: async (): Promise<unknown> => {
    throw new Error("FrameWorks asset metadata update is not exposed on VideoProvider yet");
  },

  createViaUrl: async (body: unknown): Promise<unknown> => {
    const payload = body as {
      url?: string;
      name?: string;
      filename?: string;
      title?: string;
    };
    if (!payload.url) throw new Error("url is required");
    const data = await frameworksGraphqlRequest<ImportVodAssetMutation>(IMPORT_VOD_ASSET, {
      input: {
        url: payload.url,
        filename: payload.filename ?? payload.name,
        title: payload.title ?? payload.name,
      },
    });
    const result = data.importVodAsset;
    if (result.__typename === "ValidationError") {
      throw new Error(result.message ?? "Import failed");
    }
    return {
      data: {
        asset: {
          id: result.id,
          playbackId: result.playbackId,
          status: { phase: result.status ?? "processing" },
          name: payload.name,
        },
      },
    };
  },

  delete: async (assetId: string): Promise<void> => {
    const data = await frameworksGraphqlRequest<DeleteVodAssetMutation>(DELETE_VOD_ASSET, {
      id: assetId,
    });
    if (data.deleteVodAsset.__typename === "NotFoundError") {
      throw new Error(data.deleteVodAsset.message ?? "Asset not found");
    }
  },
};
