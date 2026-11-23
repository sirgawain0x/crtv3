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

  const FRAMEWORKS_STREAM_QUERY_FIELDS = ["id", "name", "playbackId", "streamKey"] as const;

  it("GET_STREAM query selects only published Stream fields (no isActive)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          stream: {
            id: "stream-1",
            name: "Show",
            playbackId: "pb",
            streamKey: "sk",
          },
        },
      }),
    });

    await getVideoProvider().streams.getOrNull("stream-1");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      query: string;
    };
    expect(body.query).not.toMatch(/\bisActive\b/);
    for (const field of FRAMEWORKS_STREAM_QUERY_FIELDS) {
      expect(body.query).toMatch(new RegExp(`\\b${field}\\b`));
    }
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
                durationSeconds: 60,
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
    expect(sessions[0]?.sourceSegmentsDuration).toBe(60);
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
              __typename: "Stream",
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
    const policyBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      variables: { input: { policy: { jwt?: { allowedKids?: string[]; requiredAudience?: string[] } } } };
    };
    expect(policyBody.variables.input.policy.jwt?.allowedKids).toEqual(["kid-abc"]);
    expect(policyBody.variables.input.policy.jwt?.requiredAudience).toEqual(["p1"]);
  });

  it("create throws on AuthError from createStream", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          createStream: {
            __typename: "AuthError",
            message: "missing streams:write scope",
          },
        },
      }),
    });

    await expect(
      getVideoProvider().streams.create({
        name: "Show",
        profiles: [],
        record: true,
        playbackPolicy: {},
        creatorId: "0x1",
      }),
    ).rejects.toThrow("missing streams:write scope");
  });

  it.each(["AuthError", "ValidationError", "NotFoundError", "UnexpectedResult"])(
    "create rejects a stream when playback policy returns %s",
    async (__typename) => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              createStream: {
                __typename: "Stream",
                id: "s1",
                playbackId: "p1",
                streamKey: "secret-key",
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { setPlaybackPolicy: { __typename, message: "Policy rejected" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { deleteStream: { __typename: "DeleteSuccess" } },
          }),
        });

      await expect(
        getVideoProvider().streams.create({
          name: "Show",
          profiles: [],
          record: true,
          playbackPolicy: { type: "jwt" },
          creatorId: "0x1",
        }),
      ).rejects.toThrow("Policy rejected");

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const deleteBody = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)) as {
        variables: { id: string };
        query: string;
      };
      expect(deleteBody.query).toContain("deleteStream");
      expect(deleteBody.variables.id).toBe("s1");
    },
  );

  it("create rethrows policy error when deleteStream cleanup fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            createStream: {
              __typename: "Stream",
              id: "orphan-1",
              playbackId: "p1",
              streamKey: "sk",
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            setPlaybackPolicy: {
              __typename: "ValidationError",
              message: "Policy rejected",
            },
          },
        }),
      })
      .mockRejectedValueOnce(new Error("delete network error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      getVideoProvider().streams.create({
        name: "Show",
        profiles: [],
        record: true,
        playbackPolicy: { type: "jwt" },
        creatorId: "0x1",
      }),
    ).rejects.toThrow("Policy rejected");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("webhook playback policy does not fall back to FRAMEWORKS_WEBHOOK_SECRET", async () => {
    vi.stubEnv("FRAMEWORKS_WEBHOOK_SECRET", "env-secret-should-not-leak");
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            createStream: {
              __typename: "Stream",
              id: "s-wh",
              playbackId: "p1",
              streamKey: "sk",
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { setPlaybackPolicy: { __typename: "Stream", id: "s-wh" } },
        }),
      });

    await getVideoProvider().streams.create({
      name: "Show",
      profiles: [],
      record: true,
      playbackPolicy: {
        type: "webhook",
        url: "https://example.com/hook",
      },
      creatorId: "0x1",
    });

    const policyBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      variables: { input: { policy: { webhook?: { secret?: string } } } };
    };
    expect(policyBody.variables.input.policy.webhook?.secret).toBeUndefined();
  });

  it("createClip rejects an unresolved stream ID without a mutation", async () => {
    const result = await getVideoProvider().streams.createClip({
      playbackId: "live-pb",
      sessionId: "session-live-pb",
      startTime: 1_700_000_000,
      endTime: 1_700_000_060,
    });
    expect(result.error).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("createClip surfaces NotFoundError and AuthError as failures", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          createClip: {
            __typename: "NotFoundError",
            message: "stream not found",
          },
        },
      }),
    });

    const notFound = await getVideoProvider().streams.createClip({
      playbackId: "live-pb",
      streamId: "stream-global",
      sessionId: "missing",
      startTime: 1_700_000_000,
      endTime: 1_700_000_060,
    });
    expect(notFound.error).toBe("stream not found");
    expect(notFound.newPlaybackId).toBe("");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          createClip: {
            __typename: "AuthError",
            message: "unauthorized clip create",
          },
        },
      }),
    });

    const auth = await getVideoProvider().streams.createClip({
      playbackId: "live-pb",
      streamId: "stream-global",
      sessionId: "session-live-pb",
      startTime: 1_700_000_000,
      endTime: 1_700_000_060,
    });
    expect(auth.error).toBe("unauthorized clip create");
    expect(auth.error).not.toContain("playback ID not ready");
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
      streamId: "stream-global",
      sessionId: "session-live-pb",
      startTime: 1_700_000_000_000,
      endTime: 1_700_000_060_000,
      name: "Highlight",
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.variables.input.streamId).toBe("stream-global");
    expect(body.variables.input.startUnix).toBe(1_700_000_000);
    expect(body.variables.input.stopUnix).toBe(1_700_000_060);
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
