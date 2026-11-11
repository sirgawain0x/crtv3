import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVideoProvider,
  getVideoProviderId,
  resetVideoProviderForTests,
} from "./index";
import {
  assertUploadsAndAssetsAvailable,
  FrameWorksUploadsAssetsUnavailableError,
} from "./uploads-assets-guard";

describe("video provider selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
  });

  it("defaults to livepeer when VIDEO_PROVIDER is unset", () => {
    delete process.env.VIDEO_PROVIDER;
    resetVideoProviderForTests();
    expect(getVideoProviderId()).toBe("livepeer");
    expect(getVideoProvider().id).toBe("livepeer");
  });

  it("selects frameworks when VIDEO_PROVIDER=frameworks", () => {
    vi.stubEnv("VIDEO_PROVIDER", "frameworks");
    vi.stubEnv("FRAMEWORKS_API_TOKEN", "token");
    resetVideoProviderForTests();
    expect(getVideoProvider().id).toBe("frameworks");
  });
});

describe("livepeer provider (HTTP)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("VIDEO_PROVIDER", "livepeer");
    vi.stubEnv("LIVEPEER_FULL_API_KEY", "test-key");
    vi.stubEnv("LIVEPEER_FULL_API_URL", "https://livepeer.studio");
    resetVideoProviderForTests();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
    fetchMock.mockReset();
  });

  it("getOrNull returns null on 404", async () => {
    fetchMock.mockResolvedValueOnce({ status: 404, ok: false });
    const provider = getVideoProvider();
    await expect(provider.streams.getOrNull("stream-1")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://livepeer.studio/api/stream/stream-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("create stream maps identifiers from Studio response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: "s1",
        playbackId: "p1",
        streamKey: "k1",
      }),
    });
    const created = await getVideoProvider().streams.create({
      name: "test",
      profiles: [],
      record: true,
      playbackPolicy: { type: "jwt" },
      creatorId: "0xabc",
    });
    expect(created).toEqual({
      streamId: "s1",
      playbackId: "p1",
      streamKey: "k1",
    });
  });
});

describe("frameworks provider", () => {
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

  it("createStream calls GraphQL createStream mutation", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          createStream: {
            __typename: "StreamWithKey",
            id: "c3RyZWFtOjE",
            playbackId: "playback-1",
            streamKey: "key-1",
          },
        },
      }),
    });

    const created = await getVideoProvider().streams.create({
      name: "Launch",
      profiles: [],
      record: true,
      playbackPolicy: {},
      creatorId: "0x1",
    });

    expect(created.streamId).toBe("c3RyZWFtOjE");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      query: string;
      variables: { input: { name: string } };
    };
    expect(body.query).toContain("createStream");
    expect(body.variables.input.name).toBe("Launch");
  });

  it("assets are blocked by uploads guard before provider stub", () => {
    expect(() => assertUploadsAndAssetsAvailable("test")).toThrow(/#406/);
    try {
      assertUploadsAndAssetsAvailable("test");
    } catch (e) {
      expect(e).toBeInstanceOf(FrameWorksUploadsAssetsUnavailableError);
    }
  });

  it("ai.isEnabled is false on frameworks provider surface", () => {
    expect(getVideoProvider().ai.isEnabled()).toBe(false);
  });
});
