import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getVideoProvider, resetVideoProviderForTests } from "../index";

describe("frameworks assets (#406)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("VIDEO_PROVIDER", "frameworks");
    vi.stubEnv("FRAMEWORKS_API_TOKEN", "fw-token");
    vi.stubEnv("FRAMEWORKS_GRAPHQL_URL", "https://bridge.example/graphql");
    resetVideoProviderForTests();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
    fetchMock.mockReset();
  });

  it("assets.get returns vodAsset summary", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          vodAsset: {
            id: "vod-1",
            playbackId: "pb-vod",
            title: "Talk",
            status: "ready",
            durationMs: 120000,
          },
        },
      }),
    });

    const asset = await getVideoProvider().assets.get("vod-1");
    expect(asset?.id).toBe("vod-1");
    expect(asset?.status?.phase).toBe("ready");
    expect(asset?.playbackUrl).toContain("pb-vod");
  });

  it("create maps createVodUpload for upload pipeline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          createVodUpload: {
            __typename: "VodUploadSession",
            uploadId: "up-1",
            assetId: "vod-2",
            playbackId: "pb-2",
            presignedParts: [{ partNumber: 1, url: "https://s3.example/part1" }],
          },
        },
      }),
    });

    const result = (await getVideoProvider().assets.create({
      name: "demo.mp4",
      sizeBytes: 4096,
    })) as { data?: { tusEndpoint?: string; asset?: { id?: string } } };
    expect(result.data?.asset?.id).toBe("vod-2");
    expect(result.data?.tusEndpoint).toBe("https://s3.example/part1");
  });

  it("createViaUrl uses importVodAsset", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          importVodAsset: {
            __typename: "VodAsset",
            id: "vod-import",
            playbackId: "pb-import",
            status: "processing",
          },
        },
      }),
    });

    const result = (await getVideoProvider().assets.createViaUrl({
      url: "https://cdn.example/video.mp4",
      name: "Remote",
    })) as { data?: { asset?: { id?: string } } };
    expect(result.data?.asset?.id).toBe("vod-import");
  });
});
