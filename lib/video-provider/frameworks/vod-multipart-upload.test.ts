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

  it("retries a failing part and succeeds on the final attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, headers: { get: () => null } })
      .mockResolvedValueOnce({ ok: false, status: 503, headers: { get: () => null } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => '"etag-2"' },
      });

    const file = {
      size: 4,
      type: "video/mp4",
      slice: () => new Blob(["test"]),
    } as File;

    const result = await uploadFileViaPresignedParts(
      file,
      [{ partNumber: 1, url: "https://s3.example/p1" }],
      { fetchImpl: fetchMock, partSize: 4, maxPartRetries: 2 },
    );

    expect(result).toEqual([{ partNumber: 1, etag: '"etag-2"' }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("aborts upload after retries are exhausted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
    });
    const abortMock = vi.fn().mockResolvedValue(undefined);

    const file = {
      size: 4,
      type: "video/mp4",
      slice: () => new Blob(["test"]),
    } as File;

    await expect(
      uploadFileViaPresignedParts(
        file,
        [{ partNumber: 1, url: "https://s3.example/p1" }],
        {
          fetchImpl: fetchMock,
          uploadId: "session-99",
          abortVodUpload: abortMock,
          maxPartRetries: 2,
        },
      ),
    ).rejects.toThrow(/part 1 failed/);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(abortMock).toHaveBeenCalledWith("session-99");
  });

  it("swallows abort errors after part failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
    });
    const abortMock = vi.fn().mockRejectedValue(new Error("abort network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const file = {
      size: 4,
      type: "video/mp4",
      slice: () => new Blob(["test"]),
    } as File;

    await expect(
      uploadFileViaPresignedParts(
        file,
        [{ partNumber: 1, url: "https://s3.example/p1" }],
        {
          fetchImpl: fetchMock,
          uploadId: "session-err",
          abortVodUpload: abortMock,
          maxPartRetries: 0,
        },
      ),
    ).rejects.toThrow();

    expect(abortMock).toHaveBeenCalledWith("session-err");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});