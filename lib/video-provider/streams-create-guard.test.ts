import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  assertStreamCreationAvailable,
  resetVideoProviderForTests,
} from "./index";
import { createLivepeerStream } from "@/lib/livepeer/studio-api";
import { POST as livepeerProxyPost } from "@/app/api/livepeer/livepeer-proxy/route";
import { GET as streamKeyGet } from "@/app/api/livepeer/stream-key/route";

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock("viem", () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}));

const CREATOR = "0xcccccccccccccccccccccccccccccccccccccccc";

const mockRequireWalletAuthFor = vi.fn();
const mockResolveStreamForCreator = vi.fn();
const mockEnsureLivepeerStreamForCreator = vi.fn();
const mockDefaultStreamCreateOptions = vi.fn();

vi.mock("@/lib/middleware/rateLimit", () => ({
  rateLimiters: { standard: vi.fn(async () => null) },
}));

vi.mock("@/lib/auth/require-wallet", () => ({
  requireWalletAuthFor: (...args: unknown[]) => mockRequireWalletAuthFor(...args),
  WalletAuthError: class WalletAuthError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "WalletAuthError";
    }
  },
}));

vi.mock("@/services/streams", () => ({
  resolveStreamForCreator: (...args: unknown[]) => mockResolveStreamForCreator(...args),
}));

vi.mock("@/lib/livepeer/ensure-stream", () => ({
  ensureLivepeerStreamForCreator: (...args: unknown[]) =>
    mockEnsureLivepeerStreamForCreator(...args),
  defaultStreamCreateOptions: (...args: unknown[]) =>
    mockDefaultStreamCreateOptions(...args),
}));

const validProxyBody = {
  creatorAddress: CREATOR,
  name: "Test Stream",
  profiles: [
    {
      name: "720p",
      width: 1280,
      height: 720,
      bitrate: 2_500_000,
      fps: 30,
      fpsDen: 1,
      quality: 23,
      gop: "2",
      profile: "H264Baseline",
    },
  ],
  record: true,
  playbackPolicy: { type: "jwt" },
};

describe("streams create guard (#404)", () => {
  const fetchMock = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  describe("frameworks mode", () => {
    beforeEach(() => {
      vi.stubEnv("VIDEO_PROVIDER", "frameworks");
      vi.stubEnv("FRAMEWORKS_API_TOKEN", "token");
      vi.stubEnv("FRAMEWORKS_SIGNING_KID", "kid-1");
      resetVideoProviderForTests();
      vi.stubGlobal("fetch", fetchMock);
      mockRequireWalletAuthFor.mockResolvedValue({ address: CREATOR });
    });

    it("assertStreamCreationAvailable is a no-op after #404", () => {
      expect(() => assertStreamCreationAvailable("test")).not.toThrow();
    });

    it("studio-api.createLivepeerStream calls FrameWorks createStream", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              createStream: {
                __typename: "StreamWithKey",
                id: "stream-gql",
                playbackId: "pb",
                streamKey: "sk",
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              setPlaybackPolicy: { __typename: "Stream", id: "stream-gql" },
            },
          }),
        });

      const created = await createLivepeerStream({
        name: "x",
        profiles: [],
        record: true,
        playbackPolicy: { type: "jwt" },
        creatorId: CREATOR,
      });
      expect(created.streamKey).toBe("sk");
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe("livepeer mode", () => {
    beforeEach(() => {
      vi.stubEnv("VIDEO_PROVIDER", "livepeer");
      vi.stubEnv("LIVEPEER_FULL_API_KEY", "test-key");
      resetVideoProviderForTests();
    });

    it("does not throw on guard", () => {
      expect(() => assertStreamCreationAvailable("probe")).not.toThrow();
    });
  });
});
