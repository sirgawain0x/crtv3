import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  assertStreamCreationAvailable,
  FrameWorksStreamsCreateUnavailableError,
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

const EXPECTED =
  "FrameWorks stream creation not available yet (#404)" as const;

async function expectFrameworksRefusal(run: () => Promise<unknown>) {
  await expect(run()).rejects.toThrow(EXPECTED);
  await expect(run()).rejects.toBeInstanceOf(
    FrameWorksStreamsCreateUnavailableError,
  );
}

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

describe("streams create guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetVideoProviderForTests();
    vi.clearAllMocks();
  });

  describe("frameworks mode", () => {
    beforeEach(() => {
      vi.stubEnv("VIDEO_PROVIDER", "frameworks");
      vi.stubEnv("FRAMEWORKS_API_TOKEN", "token");
      resetVideoProviderForTests();
      mockRequireWalletAuthFor.mockResolvedValue({ address: CREATOR });
      process.env.LIVEPEER_FULL_API_KEY = "test-full-key";
    });

    it("assertStreamCreationAvailable throws typed error", () => {
      expect(() => assertStreamCreationAvailable("test")).toThrow(EXPECTED);
    });

    it("studio-api.createLivepeerStream refuses before provider call", async () => {
      await expectFrameworksRefusal(() =>
        createLivepeerStream({
          name: "x",
          profiles: [],
          record: true,
          playbackPolicy: {},
          creatorId: CREATOR,
        }),
      );
    });

    it("livepeer-proxy POST returns 503 JSON", async () => {
      mockResolveStreamForCreator.mockResolvedValue(null);
      mockEnsureLivepeerStreamForCreator.mockImplementation(() =>
        createLivepeerStream({
          name: "x",
          profiles: validProxyBody.profiles,
          record: true,
          playbackPolicy: {},
          creatorId: CREATOR,
        }),
      );

      const res = await livepeerProxyPost(
        new NextRequest("http://localhost/api/livepeer/livepeer-proxy", {
          method: "POST",
          body: JSON.stringify(validProxyBody),
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe(EXPECTED);
    });

    it("stream-key GET returns 503 when ensure creates a stream", async () => {
      mockDefaultStreamCreateOptions.mockReturnValue({
        creatorId: CREATOR,
        name: "Broadcast-1",
        profiles: [],
        record: true,
        playbackPolicy: { type: "jwt" },
      });
      mockResolveStreamForCreator.mockResolvedValue({
        id: "db-1",
        creator_id: CREATOR,
        stream_id: null,
        playback_id: null,
        stream_key: null,
        name: "My Stream",
        save_recording: true,
      });
      mockEnsureLivepeerStreamForCreator.mockImplementation(() =>
        createLivepeerStream({
          name: "x",
          profiles: [],
          record: true,
          playbackPolicy: {},
          creatorId: CREATOR,
        }),
      );

      const res = await streamKeyGet(
        new NextRequest(
          `http://localhost/api/livepeer/stream-key?creatorAddress=${CREATOR}`,
        ),
      );
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe(EXPECTED);
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
