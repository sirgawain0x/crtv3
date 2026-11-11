import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetVideoProviderForTests, getVideoProvider } from "../index";

describe("frameworks streams (#404)", () => {
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

  it("getSessions maps ready recording artifacts", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          storageArtifactsConnection: {
            nodes: [
              {
                id: "artifact-1",
                playbackId: "pb-1",
                kind: "CHAPTER",
                status: "ready",
                createdAt: "2024-01-01T00:00:00Z",
                durationMs: 60000,
              },
            ],
          },
        },
      }),
    });

    const sessions = await getVideoProvider().streams.getSessions("stream-1", {
      record: true,
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe("artifact-1");
    expect(sessions[0]?.recordingStatus).toBe("ready");
    expect(sessions[0]?.recordingUrl).toContain("pb-1");
  });

  it("getWithMultistream returns Livepeer-shaped multistream targets", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          stream: {
            id: "stream-1",
            pushTargets: [
              {
                id: "pt-1",
                name: "Twitch",
                targetUri: "rtmp://live.twitch.tv/app/key",
                isEnabled: true,
              },
            ],
          },
        },
      }),
    });

    const result = (await getVideoProvider().streams.getWithMultistream(
      "stream-1",
    )) as { stream?: { multistream?: { targets?: Array<{ id: string }> } } };
    expect(result?.stream?.multistream?.targets?.[0]?.id).toBe("pt-1");
  });

  it("addMultistreamTarget calls createPushTarget", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          createPushTarget: {
            id: "pt-new",
            name: "YT",
            status: "idle",
          },
        },
      }),
    });

    const target = (await getVideoProvider().streams.addMultistreamTarget(
      { spec: { name: "YT", url: "rtmp://youtube.example/live/key" } },
      "stream-1",
    )) as { id?: string };
    expect(target.id).toBe("pt-new");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      query: string;
    };
    expect(body.query).toContain("createPushTarget");
  });

  it("create wires streamKey and setPlaybackPolicy for jwt policy", async () => {
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-abc");
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            createStream: {
              __typename: "StreamWithKey",
              id: "s1",
              playbackId: "p1",
              streamKey: "secret-key",
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            setPlaybackPolicy: { __typename: "Stream", id: "s1" },
          },
        }),
      });

    const created = await getVideoProvider().streams.create({
      name: "Show",
      profiles: [],
      record: true,
      playbackPolicy: { type: "jwt" },
      creatorId: "0x1",
    });
    expect(created).toMatchObject({
      streamId: "s1",
      playbackId: "p1",
      streamKey: "secret-key",
    });
  });

  it("createClip maps Clip result to CreateClipResult", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          createClip: {
            __typename: "Clip",
            id: "clip-1",
            playbackId: "clip-pb",
            status: "ready",
          },
        },
      }),
    });

    const created = await getVideoProvider().streams.createClip({
      playbackId: "live-pb",
      sessionId: "stream-global",
      startTime: 1_700_000_000_000,
      endTime: 1_700_000_060_000,
      name: "Highlight",
    });
    expect(created.newPlaybackId).toBe("clip-pb");
    expect(created.playbackUrl).toContain("clip-pb");
  });

  it("multistream.delete calls deletePushTarget", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { deletePushTarget: { success: true, deletedId: "pt-1" } },
      }),
    });

    await getVideoProvider().multistream.delete("pt-1");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      query: string;
    };
    expect(body.query).toContain("deletePushTarget");
  });
});
