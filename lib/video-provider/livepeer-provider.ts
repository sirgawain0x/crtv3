import { getFullLivepeer } from "@/lib/sdk/livepeer/fullClient";
import {
  hasLivepeerPrivateApiKey,
  isLivepeerConfigured,
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from "@/lib/sdk/livepeer/studioAuth";
import type { Livepeer } from "livepeer";
import type {
  AssetPatchPayload,
  NewAssetFromUrlPayload,
  NewAssetPayload,
  TargetAddPayload,
  TextToImageParams,
} from "livepeer/models/components";
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

function sanitizeId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

function authHeaders(): HeadersInit {
  const token = resolveLivepeerStudioAuthToken();
  if (!token) {
    throw new Error("LIVEPEER_NOT_CONFIGURED");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function baseUrl(): string {
  return livepeerStudioApiBaseUrl();
}

async function studioGetStream(streamId: string): Promise<StreamSummary | null> {
  const safeId = sanitizeId(streamId);
  if (!safeId) return null;

  const res = await fetch(`${baseUrl()}/api/stream/${encodeURIComponent(safeId)}`, {
    headers: authHeaders(),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 400 || res.status === 410) {
      const lower = text.toLowerCase();
      if (lower.includes("not found") || lower.includes("does not exist")) {
        return null;
      }
    }
    throw new Error(`Failed to fetch Livepeer stream: ${res.status} ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const stream = (data.stream as Record<string, unknown> | undefined) ?? data;
  const id = typeof stream.id === "string" ? stream.id : safeId;
  return {
    id,
    playbackId:
      typeof stream.playbackId === "string" ? stream.playbackId : undefined,
    streamKey:
      typeof stream.streamKey === "string" ? stream.streamKey : undefined,
    name: typeof stream.name === "string" ? stream.name : undefined,
    isActive:
      typeof stream.isActive === "boolean" ? stream.isActive : undefined,
  };
}

async function studioCreateStream(
  params: CreateStreamParams,
): Promise<CreatedStream> {
  const res = await fetch(`${baseUrl()}/api/stream`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: params.name,
      profiles: params.profiles,
      record: params.record,
      playbackPolicy: params.playbackPolicy,
      creatorId: {
        type: "unverified",
        value: params.creatorId.toLowerCase(),
      },
    }),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`Livepeer create stream returned non-JSON (${res.status})`);
  }

  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : `Failed to create stream (${res.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const nested = data.stream as Record<string, unknown> | undefined;
  const streamKey =
    (typeof data.streamKey === "string" ? data.streamKey : undefined) ||
    (typeof nested?.streamKey === "string" ? nested.streamKey : undefined);
  const streamId =
    (typeof data.id === "string" ? data.id : undefined) ||
    (typeof nested?.id === "string" ? nested.id : undefined);
  const playbackId =
    (typeof data.playbackId === "string" ? data.playbackId : undefined) ||
    (typeof nested?.playbackId === "string" ? nested.playbackId : undefined);

  if (!streamKey || !streamId || !playbackId) {
    throw new Error("Livepeer response missing stream identifiers");
  }

  return { streamId, playbackId, streamKey };
}

function requireSdk(): Livepeer {
  const client = getFullLivepeer();
  if (!client) {
    throw new Error("LIVEPEER_NOT_CONFIGURED");
  }
  return client;
}

export const livepeerVideoProvider: VideoProvider = {
  id: "livepeer",

  isConfigured: () => isLivepeerConfigured(),
  hasPrivateMetricsKey: () => hasLivepeerPrivateApiKey(),
  apiBaseUrl: () => baseUrl(),
  resolveAuthToken: () => resolveLivepeerStudioAuthToken(),
  getLivepeerSdkClient: () => getFullLivepeer(),

  streams: {
    getOrNull: studioGetStream,
    create: studioCreateStream,
    setRecording: async (streamId, record) => {
      const res = await fetch(`${baseUrl()}/api/stream/${streamId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ record }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Failed to ${record ? "enable" : "disable"} stream recording: ${res.status} ${text}`,
        );
      }
    },
    getSessions: async (streamId, options) => {
      const params = new URLSearchParams();
      if (options?.record) params.set("record", "true");
      const qs = params.toString();
      const url = `${baseUrl()}/api/stream/${streamId}/sessions${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to fetch stream sessions: ${res.status} ${text}`);
      }
      const data = await res.json();
      return (Array.isArray(data) ? data : []) as StreamSession[];
    },
    getWithMultistream: async (streamId) => {
      return requireSdk().stream.get(streamId);
    },
    addMultistreamTarget: async (spec, streamId) => {
      return requireSdk().stream.addMultistreamTarget(
        spec as TargetAddPayload,
        streamId,
      );
    },
    createClip: async (params: CreateClipParams): Promise<CreateClipResult> => {
      if (
        !params.playbackId ||
        !params.sessionId ||
        !params.startTime ||
        !params.endTime
      ) {
        return {
          playbackUrl: "",
          assetId: "",
          newPlaybackId: "",
          error: "Missing required fields",
        };
      }
      try {
        const result = await requireSdk().stream.createClip({
          playbackId: params.playbackId,
          startTime: params.startTime,
          endTime: params.endTime,
          name: params.name,
          sessionId: params.sessionId,
        });
        const playbackUrl = result.data?.asset.playbackUrl ?? "";
        const assetId = result.data?.asset.id ?? "";
        const newPlaybackId = result.data?.asset.playbackId ?? "";
        if (!playbackUrl) {
          return {
            playbackUrl: "",
            assetId,
            newPlaybackId,
            error: "Clip created but playback URL not ready yet.",
          };
        }
        return { playbackUrl, assetId, newPlaybackId };
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return {
          playbackUrl: "",
          assetId: "",
          newPlaybackId: "",
          error: message,
        };
      }
    },
  },

  assets: {
    get: async (assetId) => {
      const safeAssetId = sanitizeId(assetId);
      if (!safeAssetId) return null;
      const res = await fetch(
        `${baseUrl()}/api/asset/${encodeURIComponent(safeAssetId)}`,
        { headers: authHeaders() },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data?.asset ?? data) as AssetSummary;
    },
    listRecentRecordings: async (limit = 20) => {
      const res = await fetch(
        `${baseUrl()}/api/asset?limit=${limit}&order=createdAt-false`,
        { headers: authHeaders() },
      );
      if (!res.ok) return [];
      const data = await res.json();
      const assets = (Array.isArray(data) ? data : []) as AssetSummary[];
      return assets.filter((a) => a.source?.type === "recording");
    },
    getAll: async () => requireSdk().asset.getAll(),
    getById: async (assetId) => requireSdk().asset.get(assetId),
    create: async (body) => requireSdk().asset.create(body as NewAssetPayload),
    update: async (body, assetId) =>
      requireSdk().asset.update(body as AssetPatchPayload, assetId),
    createViaUrl: async (body) =>
      requireSdk().asset.createViaUrl(body as NewAssetFromUrlPayload),
    delete: async (assetId) => {
      await requireSdk().asset.delete(assetId);
    },
  },

  playback: {
    get: async (playbackId) => {
      const response = await requireSdk().playback.get(playbackId);
      return response as PlaybackInfoResult;
    },
  },

  multistream: {
    delete: async (targetId) => {
      await requireSdk().multistream.delete(targetId);
    },
  },

  ai: {
    isEnabled: () => true,
    textToImage: async (params) =>
      requireSdk().generate.textToImage(params as TextToImageParams),
  },

  webhookSecretEnvKey: () => "LIVEPEER_WEBHOOK_SECRET",
};
