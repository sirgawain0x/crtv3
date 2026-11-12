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
          storageArtifactsConnection: { nodes: [] },
        },
      }),
    });
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

  it("assets.get resolves CHAPTER artifacts via artifactHash before vodAsset", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          storageArtifactsConnection: {
            nodes: [
              {
                id: "chapter-1",
                playbackId: "pb-ch",
                title: "Broadcast part",
                kind: "CHAPTER",
                status: "ready",
                streamId: "stream-77",
                durationSeconds: 95.4,
              },
            ],
          },
        },
      }),
    });

    const asset = await getVideoProvider().assets.get("chapter-hash");
    expect(asset?.id).toBe("chapter-1");
    expect(asset?.source?.type).toBe("recording");
    expect(asset?.videoSpec?.duration).toBe(95);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.variables.input.artifactHash).toBe("chapter-hash");
  });

  it("create maps createVodUpload for upload pipeline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          createVodUpload: {
            __typename: "VodUploadSession",
            id: "up-1",
            artifactId: "vod-2",
            playbackId: "pb-2",
            partSize: 4096,
            parts: [{ partNumber: 1, presignedUrl: "https://s3.example/part1" }],
          },
        },
      }),
    });

    const result = (await getVideoProvider().assets.create({
      name: "demo.mp4",
      sizeBytes: 4096,
    })) as {
      data?: {
        tusEndpoint?: string;
        presignedParts?: Array<{ url?: string }>;
        asset?: { id?: string };
      };
    };
    expect(result.data?.asset?.id).toBe("vod-2");
    expect(result.data?.tusEndpoint).toBeUndefined();
    expect(result.data?.presignedParts?.[0]?.url).toBe("https://s3.example/part1");
    expect((result.data as { uploadId?: string })?.uploadId).toBe("up-1");

    const [, createInit] = fetchMock.mock.calls[0] ?? [];
    const createBody = JSON.parse(String((createInit as RequestInit).body));
    expect(createBody.variables.input.sizeBytes).toBe(4096);
    expect(createBody.variables.input.sizeBytes).not.toBe(1);
  });

  it("rejects create when sizeBytes is omitted", async () => {
    await expect(getVideoProvider().assets.create({ name: "demo.mp4" })).rejects.toThrow(
      /sizeBytes/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getAll returns { data: Asset[] } shape for fetchAllAssets", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          storageArtifactsConnection: {
            nodes: [{ id: "vod-1", playbackId: "pb-1", title: "Demo", status: "ready" }],
          },
        },
      }),
    });

    const response = (await getVideoProvider().assets.getAll()) as {
      data?: Array<{ id: string }>;
      assets?: unknown;
    };
    expect(response.assets).toBeUndefined();
    expect(response.data?.[0]?.id).toBe("vod-1");
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
