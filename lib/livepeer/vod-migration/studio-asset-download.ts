/**
 * Studio does not expose `GET /api/asset/{id}/download`; ready assets include `downloadUrl`
 * on `GET /api/asset/{id}`.
 * @see https://docs.livepeer.org/v2/solutions/livepeer-studio/api-reference/assets/get
 * @see https://github.com/livepeer/studio/blob/master/packages/api/src/controllers/asset.ts
 */
export const LIVEPEER_STUDIO_GET_ASSET_DOC =
  "https://docs.livepeer.org/v2/solutions/livepeer-studio/api-reference/assets/get";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function fetchStudioAssetDownloadTarget(params: {
  baseUrl: string;
  authToken: string;
  assetId: string;
  fetchImpl?: typeof fetch;
}): Promise<{ downloadUrl: string; suggestedFilename?: string; name?: string }> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const url = `${params.baseUrl.replace(/\/$/, "")}/api/asset/${encodeURIComponent(params.assetId)}?details=1`;
  const res = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${params.authToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`GET /api/asset/${params.assetId} failed: ${res.status}`);
  }
  const body = (await res.json()) as unknown;
  const obj = asRecord(body);
  const asset = asRecord(obj?.asset) ?? obj;
  const downloadUrl = typeof asset?.downloadUrl === "string" ? asset.downloadUrl : null;
  if (!downloadUrl) {
    const source = asRecord(asset?.source);
    const sourceUrl = typeof source?.url === "string" ? source.url : null;
    if (sourceUrl) {
      return {
        downloadUrl: sourceUrl,
        suggestedFilename: typeof asset?.name === "string" ? asset.name : undefined,
        name: typeof asset?.name === "string" ? asset.name : undefined,
      };
    }
    throw new Error(`Asset ${params.assetId} has no downloadUrl or source url`);
  }
  return {
    downloadUrl,
    suggestedFilename: typeof asset?.name === "string" ? asset.name : undefined,
    name: typeof asset?.name === "string" ? asset.name : undefined,
  };
}

export async function fetchStudioAssetSourceStream(params: {
  downloadUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<{ body: ReadableStream<Uint8Array>; suggestedFilename?: string }> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const res = await fetchImpl(params.downloadUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Source download failed: ${res.status}`);
  }
  const cd = res.headers.get("content-disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(cd);
  return { body: res.body, suggestedFilename: match?.[1] };
}
