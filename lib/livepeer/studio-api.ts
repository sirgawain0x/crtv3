import {
  livepeerStudioApiBaseUrl,
  resolveLivepeerStudioAuthToken,
} from "@/lib/sdk/livepeer/studioAuth";

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

function sanitizeLivepeerId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

export type LivepeerStreamSession = {
  id: string;
  parentId?: string;
  recordingStatus?: string;
  recordingUrl?: string;
  mp4Url?: string;
  sourceSegmentsDuration?: number;
  createdAt?: number;
};

export type LivepeerAssetSource = {
  type?: string;
  sessionId?: string;
  streamId?: string;
};

export type LivepeerAssetSummary = {
  id: string;
  name?: string;
  playbackId?: string;
  playbackUrl?: string;
  source?: LivepeerAssetSource;
  videoSpec?: { duration?: number };
  status?: { phase?: string };
};

export type LivepeerStreamSummary = {
  id: string;
  playbackId?: string;
  streamKey?: string;
  name?: string;
  isActive?: boolean;
};

export type CreateLivepeerStreamParams = {
  name: string;
  profiles: Array<Record<string, unknown>>;
  record: boolean;
  playbackPolicy: Record<string, unknown>;
  creatorId: string;
};

export type CreatedLivepeerStream = {
  streamId: string;
  playbackId: string;
  streamKey: string;
};

/**
 * GET /api/stream/{id}. Returns null when the stream is missing (404 / not found).
 * Throws on auth misconfiguration or unexpected upstream errors.
 */
export async function getLivepeerStreamOrNull(
  streamId: string,
): Promise<LivepeerStreamSummary | null> {
  const safeId = sanitizeLivepeerId(streamId);
  if (!safeId) return null;

  const base = livepeerStudioApiBaseUrl();
  const res = await fetch(`${base}/api/stream/${encodeURIComponent(safeId)}`, {
    headers: authHeaders(),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Some Livepeer responses use 4xx with "not found" style bodies for deleted streams.
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

/** POST /api/stream — create a new Livepeer stream for a creator. */
export async function createLivepeerStream(
  params: CreateLivepeerStreamParams,
): Promise<CreatedLivepeerStream> {
  const base = livepeerStudioApiBaseUrl();
  const res = await fetch(`${base}/api/stream`, {
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
    const err = new Error(message) as Error & {
      status?: number;
      details?: unknown;
    };
    err.status = res.status;
    err.details = data;
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

export async function enableStreamRecording(streamId: string, record: boolean = true): Promise<void> {
  const base = livepeerStudioApiBaseUrl();
  const res = await fetch(`${base}/api/stream/${streamId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ record }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to ${record ? "enable" : "disable"} stream recording: ${res.status} ${text}`);
  }
}

export async function getStreamSessions(
  streamId: string,
  options?: { record?: boolean }
): Promise<LivepeerStreamSession[]> {
  const base = livepeerStudioApiBaseUrl();
  const params = new URLSearchParams();
  if (options?.record) params.set("record", "true");
  const qs = params.toString();
  const url = `${base}/api/stream/${streamId}/sessions${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch stream sessions: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getLivepeerAsset(assetId: string): Promise<LivepeerAssetSummary | null> {
  const safeAssetId = sanitizeLivepeerId(assetId);
  if (!safeAssetId) return null;

  const base = livepeerStudioApiBaseUrl();
  const res = await fetch(`${base}/api/asset/${encodeURIComponent(safeAssetId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data?.asset ?? data) as LivepeerAssetSummary;
}

export async function listRecentRecordingAssets(limit = 20): Promise<LivepeerAssetSummary[]> {
  const base = livepeerStudioApiBaseUrl();
  const res = await fetch(
    `${base}/api/asset?limit=${limit}&order=createdAt-false`,
    { headers: authHeaders() }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const assets = Array.isArray(data) ? data : [];
  return assets.filter((a: LivepeerAssetSummary) => a.source?.type === "recording");
}
