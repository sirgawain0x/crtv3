export type VodPresignedPart = {
  partNumber?: number;
  url?: string;
  presignedUrl?: string;
};

function partUploadUrl(part: VodPresignedPart): string | undefined {
  return part.url ?? part.presignedUrl;
}

export type CompletedVodPart = {
  partNumber: number;
  etag: string;
};

function normalizeEtag(etag: string): string {
  const trimmed = etag.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("W/")) return trimmed;
  return `"${trimmed.replace(/^"|"$/g, "")}"`;
}

const DEFAULT_PART_RETRIES = 2;

/**
 * FrameWorks VOD uploads: PUT each file slice to its presigned S3 URL, then complete via GraphQL.
 * @see https://logbook.frameworks.network/builders/recordings/#upload-flow
 */
export async function uploadFileViaPresignedParts(
  file: File,
  parts: VodPresignedPart[],
  options?: {
    partSize?: number;
    uploadId?: string;
    onProgress?: (percentage: number) => void;
    fetchImpl?: typeof fetch;
    /** Up to 2 retries per part after the initial attempt (3 tries total). */
    maxPartRetries?: number;
    /** Best-effort `abortVodUpload` when a part still fails after retries. */
    abortVodUpload?: (uploadId: string) => Promise<void>;
  },
): Promise<CompletedVodPart[]> {
  const fetchFn = options?.fetchImpl ?? fetch;
  const maxRetries = options?.maxPartRetries ?? DEFAULT_PART_RETRIES;
  const sorted = [...parts]
    .filter((p) => p.partNumber != null && partUploadUrl(p))
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

  const putPartWithRetries = async (
    part: VodPresignedPart,
    chunk: Blob,
  ): Promise<CompletedVodPart> => {
    const url = partUploadUrl(part)!;
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchFn(url, {
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

        return {
          partNumber: part.partNumber!,
          etag: normalizeEtag(etagHeader),
        };
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          continue;
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`Upload part ${part.partNumber} failed`);
  };

  try {
    for (let i = 0; i < sorted.length; i++) {
      const part = sorted[i]!;
      const start = i * partSize;
      const end = i === sorted.length - 1 ? file.size : Math.min(start + partSize, file.size);
      const chunk = file.slice(start, end);

      const completedPart = await putPartWithRetries(part, chunk);
      completed.push(completedPart);

      uploadedBytes += chunk.size;
      if (options?.onProgress && file.size > 0) {
        options.onProgress(Math.round((uploadedBytes / file.size) * 100));
      }
    }
    return completed;
  } catch (err) {
    const uploadId = options?.uploadId?.trim();
    if (uploadId && options?.abortVodUpload) {
      try {
        await options.abortVodUpload(uploadId);
      } catch (abortErr) {
        console.error("[frameworks] abortVodUpload after part failure", {
          uploadId,
          error: abortErr instanceof Error ? abortErr.message : String(abortErr),
        });
      }
    }
    throw err;
  }
}