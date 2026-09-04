import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("viem", () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
}));

const CREATOR = "0xcccccccccccccccccccccccccccccccccccccccc";

const mockRequireWalletAuthFor = vi.fn();
const mockResolveStreamForCreator = vi.fn();
const mockEnsureLivepeerStreamForCreator = vi.fn();

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
}));

vi.mock("@/lib/utils/logger", () => ({
  serverLogger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { POST } from "./route";

const validBody = {
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

function streamRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/livepeer/livepeer-proxy", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/livepeer/livepeer-proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireWalletAuthFor.mockResolvedValue({ address: CREATOR });
    mockResolveStreamForCreator.mockResolvedValue(null);
    process.env.LIVEPEER_FULL_API_KEY = "test-full-key";
  });

  it("returns MISSING_API_KEY when full key is absent", async () => {
    delete process.env.LIVEPEER_FULL_API_KEY;

    const res = await POST(streamRequest(validBody));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("MISSING_API_KEY");
  });

  it("returns 401 without wallet auth", async () => {
    const { WalletAuthError } = await import("@/lib/auth/require-wallet");
    mockRequireWalletAuthFor.mockRejectedValue(new WalletAuthError(401, "Missing wallet auth"));

    const res = await POST(streamRequest(validBody));
    expect(res.status).toBe(401);
    expect(mockEnsureLivepeerStreamForCreator).not.toHaveBeenCalled();
  });

  it("returns LIVEPEER_ERROR when ensure throws", async () => {
    const err = new Error("quota exceeded") as Error & { status?: number };
    err.status = 402;
    mockEnsureLivepeerStreamForCreator.mockRejectedValue(err);

    const res = await POST(streamRequest(validBody));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("LIVEPEER_ERROR");
    expect(body.error).toBe("quota exceeded");
  });

  it("creates stream for authenticated creator with no existing row", async () => {
    mockEnsureLivepeerStreamForCreator.mockResolvedValue({
      streamId: "stream-1",
      playbackId: "playback-1",
      streamKey: "secret-key",
      reused: false,
      replaced: false,
    });

    const res = await POST(streamRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.streamId).toBe("stream-1");
    expect(json.playbackId).toBe("playback-1");
    expect(json.streamKey).toBe("secret-key");
    expect(mockEnsureLivepeerStreamForCreator).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: CREATOR,
        existing: null,
      }),
    );
  });

  it("returns 409 STREAM_EXISTS when Livepeer stream is still valid", async () => {
    const existing = {
      id: "db-1",
      creator_id: CREATOR,
      stream_id: "old-stream",
      playback_id: "old-playback",
      stream_key: "old-key",
    };
    mockResolveStreamForCreator.mockResolvedValue(existing);
    mockEnsureLivepeerStreamForCreator.mockResolvedValue({
      streamId: "old-stream",
      playbackId: "old-playback",
      streamKey: "old-key",
      reused: true,
      replaced: false,
    });

    const res = await POST(streamRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.code).toBe("STREAM_EXISTS");
    expect(json.streamKey).toBe("old-key");
  });

  it("returns 200 with new credentials when stale Livepeer stream is healed", async () => {
    const existing = {
      id: "db-1",
      creator_id: CREATOR,
      stream_id: "dead-stream",
      playback_id: "dead-playback",
      stream_key: "dead-key",
    };
    mockResolveStreamForCreator.mockResolvedValue(existing);
    mockEnsureLivepeerStreamForCreator.mockResolvedValue({
      streamId: "new-stream",
      playbackId: "new-playback",
      streamKey: "new-key",
      reused: false,
      replaced: true,
    });

    const res = await POST(streamRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.streamId).toBe("new-stream");
    expect(json.streamKey).toBe("new-key");
    expect(json.replaced).toBe(true);
  });
});
