import type { ListStudioAssetsPage, StudioAssetListOptions, StudioAssetRecord } from "./types";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Map a Livepeer Studio asset JSON object into a normalized inventory row (no secrets). */
export function mapStudioAssetJson(raw: unknown): StudioAssetRecord | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const assetId = typeof obj.id === "string" ? obj.id : null;
  if (!assetId) return null;

  const status = asRecord(obj.status);
  const statusPhase =
    typeof status?.phase === "string"
      ? status.phase
      : typeof obj.status === "string"
        ? obj.status
        : null;

  const videoSpec = asRecord(obj.videoSpec) ?? asRecord(obj.spec);
  const durationSeconds =
    parseNumber(videoSpec?.duration) ??
    parseNumber(obj.duration) ??
    parseNumber(obj.sourceSegmentsDuration);

  const storage = asRecord(obj.storage);
  const sizeBytes =
    parseNumber(obj.size) ??
    parseNumber(storage?.size) ??
    parseNumber(asRecord(obj.files)?.original?.[0]?.size);

  const source = asRecord(obj.source);
  const downloadUrl =
    typeof obj.downloadUrl === "string"
      ? obj.downloadUrl
      : typeof obj.downloadUri === "string"
        ? obj.downloadUri
        : null;
  const sourceUrl =
    typeof source?.url === "string"
      ? source.url
      : typeof source?.downloadUrl === "string"
        ? source.downloadUrl
        : null;

  return {
    assetId,
    playbackId: typeof obj.playbackId === "string" ? obj.playbackId : null,
    name: typeof obj.name === "string" ? obj.name : null,
    statusPhase,
    sizeBytes,
    durationSeconds,
    hasDownloadUrl: Boolean(downloadUrl),
    hasSourceUrl: Boolean(sourceUrl),
  };
}

function extractNextCursor(
  body: unknown,
  assets: StudioAssetRecord[],
  pageSize: number,
): string | null {
  const obj = asRecord(body);
  if (obj) {
    const direct =
      (typeof obj.cursor === "string" && obj.cursor) ||
      (typeof obj.nextCursor === "string" && obj.nextCursor) ||
      (typeof obj.next === "string" && obj.next) ||
      null;
    if (direct) return direct;
  }

  if (assets.length < pageSize) return null;
  const last = assets[assets.length - 1];
  return last?.assetId ?? null;
}

function parseAssetsPayload(body: unknown): StudioAssetRecord[] {
  if (Array.isArray(body)) {
    return body
      .map(mapStudioAssetJson)
      .filter((a): a is StudioAssetRecord => a !== null);
  }
  const obj = asRecord(body);
  if (!obj) return [];
  const list = obj.data ?? obj.assets ?? obj.items;
  if (!Array.isArray(list)) return [];
  return list
    .map(mapStudioAssetJson)
    .filter((a): a is StudioAssetRecord => a !== null);
}

/** Fetch one page of Studio assets (GET /api/asset). */
export async function listStudioAssetsPage(
  options: StudioAssetListOptions,
  cursor?: string | null,
): Promise<ListStudioAssetsPage> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE),
  );
  const params = new URLSearchParams({
    limit: String(pageSize),
    order: "createdAt-true",
  });
  if (cursor) params.set("cursor", cursor);

  const url = `${options.baseUrl.replace(/\/$/, "")}/api/asset?${params.toString()}`;
  const res = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${options.authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Livepeer list assets failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as unknown;
  const assets = parseAssetsPayload(body);
  const headerCursor = res.headers.get("x-cursor") ?? res.headers.get("x-next-cursor");
  const nextCursor =
    headerCursor && headerCursor !== cursor
      ? headerCursor
      : extractNextCursor(body, assets, pageSize);

  return { assets, nextCursor: nextCursor && nextCursor !== cursor ? nextCursor : null };
}

/** Paginate through all Studio assets. */
export async function listAllStudioAssets(
  options: StudioAssetListOptions,
): Promise<StudioAssetRecord[]> {
  const all: StudioAssetRecord[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();

  for (let page = 0; page < 10_000; page++) {
    const { assets, nextCursor } = await listStudioAssetsPage(options, cursor);
    all.push(...assets);
    if (!nextCursor || assets.length === 0) break;
    if (seenCursors.has(nextCursor)) break;
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return all;
}
