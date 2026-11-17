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
import { assertStreamCreationAvailable } from "./streams-create-guard";

const mockLoggerWarn = vi.fn();

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

describe("video provider selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
    mockLoggerWarn.mockReset();
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

  it("falls back to livepeer for invalid VIDEO_PROVIDER with a warning", () => {
    vi.stubEnv("VIDEO_PROVIDER", "frameworkz");
    resetVideoProviderForTests();
    expect(getVideoProviderId()).toBe("livepeer");
    expect(getVideoProvider().id).toBe("livepeer");
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining("invalid VIDEO_PROVIDER"),
      expect.objectContaining({ provided: "frameworkz", fallback: "livepeer" }),
    );
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

  it("create stream error matches staging shape (status, message, details)", async () => {
    const errorBody = { error: "quota exceeded", hint: "upgrade plan" };
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => errorBody,
    });

    try {
      await getVideoProvider().streams.create({
        name: "test",
        profiles: [],
        record: true,
        playbackPolicy: { type: "jwt" },
        creatorId: "0xabc",
      });
      expect.fail("expected create to throw");
    } catch (error) {
      const err = error as Error & { status?: number; details?: unknown };
      expect(err.message).toBe("quota exceeded");
      expect(err.status).toBe(422);
      expect(err.details).toEqual(errorBody);
    }
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

  it("createStream returns streamKey and applies jwt playbackPolicy", async () => {
    vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-1");
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            createStream: {
              __typename: "Stream",
              id: "c3RyZWFtOjE",
              playbackId: "playback-1",
              streamKey: "key-1",
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            setPlaybackPolicy: { __typename: "Stream", id: "c3RyZWFtOjE" },
          },
        }),
      });

    const created = await getVideoProvider().streams.create({
      name: "Launch",
      profiles: [],
      record: true,
      playbackPolicy: { type: "jwt" },
      creatorId: "0x1",
    });

    expect(created.streamKey).toBe("key-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const policyBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      query: string;
    };
    expect(policyBody.query).toContain("setPlaybackPolicy");
  });

  it("assertStreamCreationAvailable is a no-op after #404", () => {
    expect(() => assertStreamCreationAvailable("test")).not.toThrow();
  });

  it("setRecording surfaces updateStream ValidationError", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          updateStream: {
            __typename: "ValidationError",
            message: "record not allowed",
            field: "record",
          },
        },
      }),
    });

    await expect(
      getVideoProvider().streams.setRecording("stream-1", true),
    ).rejects.toThrow("record not allowed");
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
