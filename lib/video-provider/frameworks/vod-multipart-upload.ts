export type VodPresignedPart = {
  partNumber?: number;
  url?: string;
};

export type CompletedVodPart = {
  partNumber: number;
  etag: string;
};

function normalizeEtag(etag: string): string {
  const trimmed = etag.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("W/")) return trimmed;
  return `"${trimmed.replace(/^"|"$/g, "")}"`;
}

/**
 * FrameWorks VOD uploads: PUT each file slice to its presigned S3 URL, then complete via GraphQL.
 * @see https://logbook.frameworks.network/builders/recordings/#upload-flow
 */
export async function uploadFileViaPresignedParts(
  file: File,
  parts: VodPresignedPart[],
  options?: {
    partSize?: number;
    onProgress?: (percentage: number) => void;
    fetchImpl?: typeof fetch;
  },
): Promise<CompletedVodPart[]> {
  const fetchFn = options?.fetchImpl ?? fetch;
  const sorted = [...parts]
    .filter((p) => p.partNumber != null && p.url)
    .sort((a, b) => (a.partNumber ?? 0) - (b.partNumber ?? 0));

  if (sorted.length === 0) {
    throw new Error("No presigned upload parts returned");
  }

  const partSize =
    options?.partSize && options.partSize > 0
      ? options.partSize
      : Math.ceil(file.size / sorted.length);

  const completed: CompletedVodPart[] = [];
  let uploadedBytes = 0;

  for (let i = 0; i < sorted.length; i++) {
    const part = sorted[i]!;
    const start = i * partSize;
    const end = i === sorted.length - 1 ? file.size : Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);

    const response = await fetchFn(part.url!, {
      method: "PUT",
      body: chunk,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error(`Upload part ${part.partNumber} failed (${response.status})`);
    }

    const etagHeader = response.headers.get("etag") ?? response.headers.get("ETag");
    if (!etagHeader) {
      throw new Error(`Upload part ${part.partNumber} missing ETag`);
    }

    completed.push({
      partNumber: part.partNumber!,
      etag: normalizeEtag(etagHeader),
    });

    uploadedBytes += chunk.size;
    if (options?.onProgress && file.size > 0) {
      options.onProgress(Math.round((uploadedBytes / file.size) * 100));
    }
  }

  return completed;
}
