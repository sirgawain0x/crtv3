import { parseNextCursorFromLinkHeader } from "./link-header";
import type {
  ListStudioAssetsPage,
  StudioAssetListOptions,
  StudioAssetRecord,
} from "./types";

/**
 * Livepeer Studio `GET /api/asset` (Get All Assets).
 * @see https://docs.livepeer.org/v2/solutions/livepeer-studio/api-reference/assets/get-all
 * Pagination contract (Studio API server): `limit` (1–1000, default 20), `cursor` (opaque;
 * next value from `Link: <...?cursor=...>; rel="next"`), `order` (default
 * `updatedAt-true,createdAt-true`), optional `count=true` → `X-Total-Count` header.
 * @see https://github.com/livepeer/studio/blob/master/packages/api/src/controllers/asset.ts
 */
export const LIVEPEER_STUDIO_LIST_ASSETS_DOC =
  "https://docs.livepeer.org/v2/solutions/livepeer-studio/api-reference/assets/get-all";

export const DEFAULT_STUDIO_PAGE_SIZE = 100;
export const MAX_STUDIO_PAGE_SIZE = 1000;
export const MAX_STUDIO_LIST_PAGES = 5_000;

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
  const files = asRecord(obj.files);
  const original = files?.original;
  const firstOriginal =
    Array.isArray(original) && original.length > 0
      ? asRecord(original[0])
      : null;
  const sizeBytes =
    parseNumber(obj.size) ??
    parseNumber(storage?.size) ??
    parseNumber(firstOriginal?.size);

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

export type ListStudioAssetsPageResult = ListStudioAssetsPage & {
  totalCount: number | null;
};

/** Fetch one page of Studio assets (GET /api/asset). */
export async function listStudioAssetsPage(
  options: StudioAssetListOptions,
  cursor?: string | null,
): Promise<ListStudioAssetsPageResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const pageSize = Math.min(
    MAX_STUDIO_PAGE_SIZE,
    Math.max(1, options.pageSize ?? DEFAULT_STUDIO_PAGE_SIZE),
  );
  const params = new URLSearchParams({
    limit: String(pageSize),
    order: "updatedAt-true,createdAt-true",
    count: "true",
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
  const linkHeader = res.headers.get("link");
  const nextCursor = parseNextCursorFromLinkHeader(linkHeader);

  const totalHeader = res.headers.get("X-Total-Count");
  const totalCount =
    totalHeader && totalHeader.trim() !== "" && !Number.isNaN(Number(totalHeader))
      ? Number(totalHeader)
      : null;

  if (assets.length === pageSize && !nextCursor) {
    throw new Error(
      `Livepeer list assets: full page (${pageSize}) but missing Link rel=next cursor — refusing to undercount. ${LIVEPEER_STUDIO_LIST_ASSETS_DOC}`,
    );
  }

  return { assets, nextCursor, totalCount };
}

export type ListAllStudioAssetsResult = {
  assets: StudioAssetRecord[];
  pageCount: number;
  totalCount: number | null;
};

export class StudioAssetPaginationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudioAssetPaginationError";
  }
}

/** Paginate through all Studio assets with loud failure on ambiguous pagination. */
export async function listAllStudioAssets(
  options: StudioAssetListOptions,
): Promise<ListAllStudioAssetsResult> {
  const pageSize = Math.min(
    MAX_STUDIO_PAGE_SIZE,
    Math.max(1, options.pageSize ?? DEFAULT_STUDIO_PAGE_SIZE),
  );
  const all: StudioAssetRecord[] = [];
  const seenAssetIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  let pageCount = 0;
  let totalCount: number | null = null;

  for (let page = 0; page < MAX_STUDIO_LIST_PAGES; page++) {
    const result = await listStudioAssetsPage(options, cursor);
    pageCount += 1;
    if (result.totalCount !== null) {
      totalCount = result.totalCount;
    }

    if (result.assets.length === 0) {
      break;
    }

    for (const asset of result.assets) {
      if (seenAssetIds.has(asset.assetId)) {
        throw new StudioAssetPaginationError(
          `Duplicate Studio asset id "${asset.assetId}" across pages (page ${pageCount})`,
        );
      }
      seenAssetIds.add(asset.assetId);
      all.push(asset);
    }

    const next = result.nextCursor;
    if (!next) {
      break;
    }
    if (next === cursor) {
      throw new StudioAssetPaginationError(
        `Repeated pagination cursor "${next}" on page ${pageCount}`,
      );
    }
    if (seenCursors.has(next)) {
      throw new StudioAssetPaginationError(`Cursor loop detected at "${next}"`);
    }
    seenCursors.add(next);
    cursor = next;
  }

  if (pageCount >= MAX_STUDIO_LIST_PAGES) {
    throw new StudioAssetPaginationError(
      `Exceeded max page cap (${MAX_STUDIO_LIST_PAGES}); increase MAX_STUDIO_LIST_PAGES or narrow filters`,
    );
  }

  if (totalCount !== null && all.length < totalCount) {
    throw new StudioAssetPaginationError(
      `Collected ${all.length} Studio assets but X-Total-Count=${totalCount} — pagination incomplete`,
    );
  }

  if (totalCount !== null && all.length > totalCount) {
    throw new StudioAssetPaginationError(
      `Collected ${all.length} Studio assets but X-Total-Count=${totalCount} — unexpected overcount`,
    );
  }

  return { assets: all, pageCount, totalCount };
}
