import { describe, expect, it, vi } from "vitest";
import { uploadFileViaPresignedParts } from "./vod-multipart-upload";

describe("vod multipart upload", () => {
  it("PUTs each part and returns ETags", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => '"etag-1"' },
    });

    const file = {
      size: 8,
      type: "video/mp4",
      slice: (start: number, end: number) =>
        new Blob(["01234567".slice(start, end)]),
    } as File;

    const result = await uploadFileViaPresignedParts(
      file,
      [{ partNumber: 1, url: "https://s3.example/part1" }],
      { fetchImpl: fetchMock, partSize: 8 },
    );

    expect(result).toEqual([{ partNumber: 1, etag: '"etag-1"' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://s3.example/part1",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
